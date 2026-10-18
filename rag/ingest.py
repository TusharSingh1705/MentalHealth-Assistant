# Document ingestion: parses PDF documents from documents/ and stores chunks with metadata in ChromaDB

import os
import sys
import glob
import json
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure rag directory is in path
sys.path.insert(0, str(Path(__file__).parent))

CHROMA_PERSIST_DIR = os.getenv("CHROMA_DIR", str(Path(__file__).parent / "chroma_db"))
MANIFEST_FILE = Path(__file__).parent / "index_manifest.json"

def get_documents_dir() -> Path:
    """Find the documents folder (case-insensitive and environment-aware)."""
    env_dir = os.getenv("DOCUMENTS_DIR")
    if env_dir and Path(env_dir).exists():
        return Path(env_dir)
        
    project_root = Path(__file__).parent.parent
    for candidate in ["documents", "Documents", "doc", "Docs"]:
        p = project_root / candidate
        if p.exists() and p.is_dir():
            return p
            
    # Fallback to project_root / "documents"
    return project_root / "documents"

def get_file_hash(filepath: Path) -> str:
    """Calculate MD5 hash of file to track modifications."""
    hasher = hashlib.md5()
    with open(filepath, "rb") as f:
        # Read in 64kb chunks
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def clean_document_title(filename: str, pdf_meta_title: Optional[str] = None) -> str:
    """Derive a human-readable title for a PDF document."""
    # Known canonical titles mapping
    name_lower = filename.lower()
    if "ilo" in name_lower and "psychosocial" in name_lower:
        return "ILO — The Psychosocial Working Environment: Global Developments and Pathways for Action"
    if "guidelines on mental health at work" in name_lower or "mental health at work guidelines" in name_lower:
        return "WHO Guidelines on Mental Health at Work"
    if "policy brief" in name_lower and "work" in name_lower:
        return "WHO and ILO — Mental Health at Work Policy Brief"
    if "children and young people" in name_lower:
        return "Mental Health of Children and Young People Service Guidance"
    if "promotive" in name_lower:
        return "WHO Guidelines on Mental Health Promotive and Preventive Interventions for Adolescents"
    if "stress" in name_lower:
        return "WHO — Doing What Matters in Times of Stress: An Illustrated Guide"
    if "perinatal" in name_lower:
        return "WHO Guide for Integration of Perinatal Mental Health in Maternal and Child Health Services"
    if "self-help" in name_lower:
        return "WHO Psychological Self-Help Interventions"

    if pdf_meta_title and len(pdf_meta_title.strip()) > 5 and not pdf_meta_title.startswith("v."):
        return pdf_meta_title.strip()

    # Clean filename
    clean_name = filename.rsplit(".", 1)[0]
    clean_name = clean_name.replace("_", " ").replace("—", " — ").strip()
    return clean_name

def extract_pdf_pages(filepath: Path) -> List[Dict[str, Any]]:
    """
    Extract text and page numbers from a PDF file using PyMuPDF or pypdf.
    Returns a list of dicts: {"page": int, "text": str}.
    """
    pages_data = []
    
    # Try PyMuPDF first
    try:
        import pymupdf
        doc = pymupdf.open(str(filepath))
        meta_title = doc.metadata.get("title")
        title = clean_document_title(filepath.name, meta_title)
        
        for idx in range(len(doc)):
            page_text = doc[idx].get_text("text").strip()
            # Only keep pages with meaningful text
            if len(page_text) >= 20:
                pages_data.append({
                    "page": idx + 1,
                    "text": page_text,
                    "title": title
                })
        doc.close()
        return pages_data
    except ImportError:
        pass

    # Fallback to pypdf
    try:
        import pypdf
        reader = pypdf.PdfReader(str(filepath))
        meta_title = reader.metadata.title if reader.metadata else None
        title = clean_document_title(filepath.name, meta_title)
        
        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            page_text = page_text.strip()
            if len(page_text) >= 20:
                pages_data.append({
                    "page": idx + 1,
                    "text": page_text,
                    "title": title
                })
        return pages_data
    except Exception as e:
        print(f"⚠️ Error reading {filepath.name}: {e}")
        return []

def split_page_into_chunks(page_text: str, chunk_size: int = 750, overlap: int = 120) -> List[str]:
    """Split text into overlapping chunks using LangChain splitter or fallback."""
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            separators=["\n\n", "\n", ". ", "; ", " ", ""]
        )
        return splitter.split_text(page_text)
    except ImportError:
        # Fallback text splitter
        chunks = []
        start = 0
        text_len = len(page_text)
        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunk = page_text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end >= text_len:
                break
            start += chunk_size - overlap
        return chunks

def load_manifest() -> Dict[str, Any]:
    """Load index manifest from disk."""
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"files": {}}
    return {"files": {}}

def save_manifest(manifest: Dict[str, Any]):
    """Save index manifest to disk."""
    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

def ingest_pdfs(force_reindex: bool = False):
    """
    Index PDF documents from the documents directory into persistent ChromaDB.
    Detects added, modified, and removed files for incremental indexing.
    """
    docs_dir = get_documents_dir()
    print(f"📂 Scanning PDF documents in: {docs_dir.resolve()}")

    if not docs_dir.exists():
        print(f"❌ Documents directory not found: {docs_dir}")
        return

    pdf_files = list(docs_dir.glob("*.pdf"))
    print(f"📄 Found {len(pdf_files)} PDF file(s)")

    manifest = load_manifest() if not force_reindex else {"files": {}}
    tracked_files = manifest.get("files", {})

    current_file_map = {f.name: f for f in pdf_files}
    files_to_remove = [name for name in tracked_files if name not in current_file_map]
    files_to_process = []

    for name, fpath in current_file_map.items():
        stat = fpath.stat()
        file_hash = get_file_hash(fpath)
        
        if force_reindex or name not in tracked_files:
            files_to_process.append((fpath, "new", file_hash, stat.st_mtime, stat.st_size))
        else:
            prev = tracked_files[name]
            if prev.get("hash") != file_hash or prev.get("mtime") != stat.st_mtime or prev.get("size") != stat.st_size:
                files_to_process.append((fpath, "modified", file_hash, stat.st_mtime, stat.st_size))
            else:
                print(f"  ⚡ Unchanged (already indexed): {name}")

    if not files_to_process and not files_to_remove:
        print("✅ Index is completely up-to-date. No changes detected.")
        return

    # Initialize ChromaDB client and collection
    try:
        import chromadb
        from chromadb.utils import embedding_functions

        client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        collection = client.get_or_create_collection(
            name="mindcare_kb",
            embedding_function=emb_fn
        )
    except Exception as e:
        print(f"❌ Failed to initialize ChromaDB: {e}")
        return

    # Handle removed files
    for name in files_to_remove:
        old_ids = tracked_files[name].get("chunk_ids", [])
        if old_ids:
            try:
                collection.delete(ids=old_ids)
                print(f"🗑️ Removed {len(old_ids)} obsolete chunks for deleted file: {name}")
            except Exception as e:
                print(f"⚠️ Error deleting chunks for {name}: {e}")
        del tracked_files[name]

    # Process new or modified files
    for fpath, status, file_hash, mtime, size in files_to_process:
        print(f"\n⚙️ Processing ({status}): {fpath.name}")
        
        # If modified, remove previous chunks
        if status == "modified" and fpath.name in tracked_files:
            old_ids = tracked_files[fpath.name].get("chunk_ids", [])
            if old_ids:
                try:
                    collection.delete(ids=old_ids)
                    print(f"  🔄 Purged {len(old_ids)} prior chunks for update")
                except Exception as e:
                    print(f"  ⚠️ Warning deleting old chunks: {e}")

        pages_data = extract_pdf_pages(fpath)
        if not pages_data:
            print(f"  ⚠️ No text extracted from {fpath.name}")
            continue

        doc_chunks = []
        chunk_ids = []
        documents = []
        metadatas = []

        safe_filename = "".join(c if c.isalnum() or c in "._-" else "_" for c in fpath.name)

        for p_info in pages_data:
            page_num = p_info["page"]
            title = p_info["title"]
            page_text = p_info["text"]
            
            chunks = split_page_into_chunks(page_text, chunk_size=750, overlap=120)
            for c_idx, chunk in enumerate(chunks):
                if len(chunk.strip()) < 30:
                    continue
                cid = f"{safe_filename}_p{page_num}_c{c_idx}"
                meta = {
                    "source": fpath.name,
                    "title": title,
                    "page": int(page_num),
                    "chunk_id": cid
                }
                chunk_ids.append(cid)
                documents.append(chunk)
                metadatas.append(meta)

        print(f"  🧩 Generated {len(documents)} chunks from {len(pages_data)} pages")

        # Upsert in batches of 300 to ChromaDB
        batch_size = 300
        total_batches = (len(documents) + batch_size - 1) // batch_size
        
        for b_idx in range(total_batches):
            b_start = b_idx * batch_size
            b_end = min(b_start + batch_size, len(documents))
            
            b_ids = chunk_ids[b_start:b_end]
            b_docs = documents[b_start:b_end]
            b_metas = metadatas[b_start:b_end]

            collection.upsert(ids=b_ids, documents=b_docs, metadatas=b_metas)
            print(f"    ↳ Upserted batch {b_idx + 1}/{total_batches} ({len(b_ids)} chunks)")

        # Update manifest record
        tracked_files[fpath.name] = {
            "mtime": mtime,
            "size": size,
            "hash": file_hash,
            "title": pages_data[0]["title"],
            "chunk_count": len(chunk_ids),
            "chunk_ids": chunk_ids
        }

    manifest["files"] = tracked_files
    save_manifest(manifest)
    
    total_in_db = collection.count()
    print(f"\n🎉 Ingestion complete! Total chunks in ChromaDB ('mindcare_kb'): {total_in_db}")

if __name__ == "__main__":
    force = "--reset" in sys.argv or "--force" in sys.argv
    ingest_pdfs(force_reindex=force)
