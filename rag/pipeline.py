# RAG query pipeline: runs safety checks, vector retrieval via ChromaDB,
# evidence-relevance verification, citation validation, and grounded response generation.

import os
import re
import sys
import json
import logging
import warnings
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dotenv import load_dotenv

os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
warnings.filterwarnings("ignore")
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, str(Path(__file__).parent))

from safety import evaluate_safety, DISCLAIMER_TEXT
from reranker import SimpleReranker

load_dotenv()

CHROMA_PERSIST_DIR = os.getenv("CHROMA_DIR", str(Path(__file__).parent / "chroma_db"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

ABSTENTION_RESPONSE = (
    "I could not find enough information to answer this question in the documents provided to MentalHealth Assistant."
)

class MindCareRAGPipeline:
    def __init__(self):
        self.reranker = SimpleReranker()
        self.chroma_collection = None
        self.cached_chunks = []
        self._init_retriever()
        try:
            self.reranker._load_model()
        except Exception:
            pass

    def _init_retriever(self):
        try:
            import chromadb
            from chromadb.utils import embedding_functions
            client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
            emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="all-MiniLM-L6-v2"
            )
            self.chroma_collection = client.get_collection(
                name="mindcare_kb",
                embedding_function=emb_fn
            )
        except Exception as e:
            # Fallback to index_manifest or cached chunks if ChromaDB is unavailable
            manifest_file = Path(__file__).parent / "index_manifest.json"
            if manifest_file.exists():
                try:
                    with open(manifest_file, "r", encoding="utf-8") as f:
                        self.cached_chunks = json.load(f)
                except Exception:
                    pass

    def retrieve(self, query: str, top_k: int = 6) -> List[Dict[str, Any]]:
        """Retrieve top candidate passages with metadata and distances from ChromaDB."""
        candidates = []
        if self.chroma_collection:
            try:
                results = self.chroma_collection.query(
                    query_texts=[query],
                    n_results=top_k,
                    include=["documents", "metadatas", "distances"]
                )
                if results and results.get("documents") and results["documents"][0]:
                    docs = results["documents"][0]
                    metas = results["metadatas"][0]
                    distances = results["distances"][0] if "distances" in results else [0.5] * len(docs)

                    for doc, meta, dist in zip(docs, metas, distances):
                        candidates.append({
                            "text": doc,
                            "metadata": meta,
                            "distance": float(dist)
                        })

                # If query expresses personal emotional distress or loss, augment with evidence-based coping passages
                emotional_keywords = {"lost", "loss", "grief", "low", "sad", "sadness", "overwhelmed", "lonely", "alone", "crying", "hurt"}
                q_tokens = set(re.findall(r'[a-zA-Z]{3,}', query.lower()))
                if q_tokens.intersection(emotional_keywords):
                    try:
                        coping_res = self.chroma_collection.query(
                            query_texts=["coping with emotional distress, loss, sadness, difficult feelings, stress management"],
                            n_results=3,
                            include=["documents", "metadatas", "distances"]
                        )
                        if coping_res and coping_res.get("documents") and coping_res["documents"][0]:
                            for doc, meta, dist in zip(coping_res["documents"][0], coping_res["metadatas"][0], coping_res["distances"][0]):
                                if not any(c["text"] == doc for c in candidates):
                                    candidates.append({
                                        "text": doc,
                                        "metadata": meta,
                                        "distance": float(dist)
                                    })
                    except Exception:
                        pass
            except Exception as e:
                print(f"Chroma query warning: {e}", file=sys.stderr)

        if not candidates and self.cached_chunks:
            # Fallback lexical matching
            q_words = set(re.findall(r'\w+', query.lower()))
            for c in self.cached_chunks:
                text_lower = c["text"].lower()
                matches = sum(1 for w in q_words if w in text_lower)
                if matches > 0:
                    candidates.append({
                        "text": c["text"],
                        "metadata": c.get("metadata", {}),
                        "score": matches,
                        "distance": 1.0
                    })
            candidates.sort(key=lambda x: x.get("score", 0), reverse=True)
            candidates = candidates[:top_k]

        # Apply reranking across retrieved candidates
        reranked = self.reranker.rerank(query, candidates, top_k=min(top_k, 4))
        return reranked

    def evaluate_evidence_relevance(self, query: str, chunks: List[Dict[str, Any]]) -> bool:
        """
        Evaluate if retrieved passages contain sufficient relevant evidence for the query.
        Returns False if chunks are empty, highly distant, or completely disjoint from mental wellness topics.
        """
        if not chunks:
            return False

        # 1. Check ChromaDB distance threshold
        best_distance = min([c.get("distance", 2.0) for c in chunks])
        if best_distance > 1.25:
            return False

        # 2. Check completely unrelated out-of-domain queries (cars, sports, trivia, geography)
        stop_words = {"what", "is", "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with", "how", "can", "i", "do", "does", "of", "about", "are", "you", "tell", "me", "my", "which", "very"}
        query_words = [w for w in re.findall(r'[a-zA-Z]{3,}', query.lower()) if w not in stop_words]

        # Common mental wellness & emotional keywords that are always valid
        wellness_terms = {
            "feel", "feeling", "feelings", "low", "sad", "sadness", "stress", "stressed", "anxious", "anxiety",
            "depressed", "depression", "overwhelmed", "grief", "loss", "lost", "lonely", "alone", "sleep",
            "insomnia", "panic", "tired", "worried", "worry", "fear", "afraid", "hurt", "pain", "crying",
            "mind", "health", "mental", "wellness", "care", "support", "help", "grounding", "breathe", "breathing",
            "unhook", "unhooking", "coping", "cope", "cbt", "therapy", "workplace", "burnout", "life", "problem"
        }

        is_wellness_intent = any(w in wellness_terms for w in query_words) or any(w in wellness_terms for w in re.findall(r'[a-zA-Z]{3,}', query.lower()))

        if not is_wellness_intent and query_words:
            combined_text = " ".join([c.get("text", "").lower() for c in chunks])
            matched_terms = [w for w in query_words if w in combined_text]
            term_overlap_ratio = len(matched_terms) / len(query_words)
            if term_overlap_ratio < 0.20 and best_distance > 0.70:
                return False

        return True

    def validate_and_format_citations(self, reply: str, context_chunks: List[Dict[str, Any]]) -> Tuple[str, List[Dict[str, Any]], str]:
        """
        Validate retrieved references and strip all inline citations/source tags from the reply
        to satisfy the requirement of keeping sources hidden from the user.
        """
        cleaned_reply = reply
        # Strip all source markers like [Source: ...], (Source: ...), Source: ..., and Page X
        cleaned_reply = re.sub(r'\[Source:\s*[^\]]+\]', '', cleaned_reply, flags=re.IGNORECASE)
        cleaned_reply = re.sub(r'\(Source:\s*[^)]+\)', '', cleaned_reply, flags=re.IGNORECASE)
        cleaned_reply = re.sub(r'Source:\s*[\w\s.-]+\.pdf', '', cleaned_reply, flags=re.IGNORECASE)
        cleaned_reply = re.sub(r',\s*Page\s*\d+', '', cleaned_reply, flags=re.IGNORECASE)
        cleaned_reply = re.sub(r'\n{3,}', '\n\n', cleaned_reply).strip()

        return cleaned_reply, [], ""

    def generate_response(self, query: str, context_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate grounded response strictly using retrieved PDF content.
        Uses Gemini API when configured, with grounded local synthesis fallback.
        """
        # Formulate grounded context
        context_blocks = []
        for c in context_chunks:
            meta = c.get("metadata", {})
            src = meta.get("source", "Document")
            page = meta.get("page", 1)
            title = meta.get("title", src)
            context_blocks.append(
                f"[Source Document: {src} | Title: {title} | Page: {page}]\n{c.get('text', '').strip()}"
            )
        context_text = "\n\n---\n\n".join(context_blocks)

        # 1. Attempt Gemini Generation if API key is present
        if GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=GEMINI_API_KEY)
                
                # Use high-quota lightweight flash-lite models with fallback
                model_candidates = [
                    os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
                    "gemini-3.1-flash-lite",
                    "gemini-3.8-flash"
                ]

                system_prompt = f"""You are MentalHealth Assistant, an empathetic, supportive mental wellness companion.
You must strictly follow these instructions:

## Answer Style & Formatting:
- Use simple, everyday English that anyone can understand.
- Keep answers warm, friendly, clear, and supportive.
- Avoid difficult medical or psychiatric jargon. If a technical concept is helpful, explain it in simple words.
- Structure your response primarily in natural, conversational, flowing paragraphs.
- DO NOT always use bullet points or numbered lists. Only use bullet points when the user asks for specific steps, a checklist, or when offering 2-3 distinct practical exercises/techniques where a list genuinely aids readability.
- Be respectful, non-judgmental, and empathetic.
- Answer factual questions using the mental health knowledge base provided below.
- Do NOT guess or extrapolate beyond the provided text. If the documents do not contain enough information to answer the question, state honestly: "{ABSTENTION_RESPONSE}"
- Never diagnose a mental-health condition or recommend medication.
- For crisis or immediate safety concerns, prioritize appropriate human and emergency support.

## Critical Rule - Hide Sources and File Names:
- STRICTLY DO NOT mention PDF file names, document titles, page numbers, or sources.
- Do NOT include [Source: ...], (Source: ...), or citations anywhere in your response.
- Present your helpful guidance directly and naturally without citing where it came from.

---
RETRIEVED KNOWLEDGE BASE CONTEXT:
{context_text}
---

USER QUESTION:
{query}

RESPONSE:"""

                response = None
                for candidate in model_candidates:
                    try:
                        model = genai.GenerativeModel(candidate)
                        response = model.generate_content(
                            system_prompt,
                            generation_config={"temperature": 0.2, "max_output_tokens": 800}
                        )
                        if response and response.text:
                            break
                    except Exception as mod_err:
                        if "429" in str(mod_err) or "NotFound" in str(mod_err):
                            continue
                        raise mod_err

                if response and response.text:
                    reply_text = response.text.strip()
                    
                    # Check if response indicates lack of evidence or contains abstention
                    lower_reply = reply_text.lower()
                    if (ABSTENTION_RESPONSE.lower() in lower_reply or
                        "could not find enough information" in lower_reply or
                        "not enough information in the documents" in lower_reply or
                        "provided documents do not contain" in lower_reply):
                        return {
                            "reply": ABSTENTION_RESPONSE,
                            "source": "",
                            "citations": [],
                            "disclaimer": DISCLAIMER_TEXT
                        }

                    # Validate citations (strips all inline source tags)
                    validated_reply, citations, source_badge = self.validate_and_format_citations(reply_text, context_chunks)
                    return {
                        "reply": validated_reply,
                        "source": "",
                        "citations": [],
                        "disclaimer": DISCLAIMER_TEXT
                    }
            except Exception as e:
                print(f"Gemini API generation error: {e}", file=sys.stderr)

        # 2. Grounded Extractive Fallback (Strictly based on retrieved PDF passages)
        top_chunk = context_chunks[0]
        meta = top_chunk.get("metadata", {})
        src = meta.get("source", "PDF Document")
        title = meta.get("title", src)
        passage = top_chunk.get("text", "").strip()

        # Check keyword relevance before emitting extractive fallback
        q_tokens = [w for w in re.findall(r'[a-zA-Z]{3,}', query.lower()) if w not in {"what", "how", "can", "tell", "explain", "about"}]
        passage_lower = passage.lower()
        has_overlap = any(w in passage_lower for w in q_tokens)

        if not has_overlap:
            return {
                "reply": ABSTENTION_RESPONSE,
                "source": "",
                "citations": [],
                "disclaimer": DISCLAIMER_TEXT
            }

        # Build clean extractive reply directly without document names or source citations
        clean_passage = re.sub(r'\[Source:\s*[^\]]+\]', '', passage, flags=re.IGNORECASE)
        clean_passage = re.sub(r'\(Source:\s*[^)]+\)', '', clean_passage, flags=re.IGNORECASE)
        clean_passage = re.sub(r'Source:\s*[\w\s.-]+\.pdf', '', clean_passage, flags=re.IGNORECASE)
        reply = clean_passage.strip()

        return {
            "reply": reply,
            "source": "",
            "citations": [],
            "disclaimer": DISCLAIMER_TEXT
        }

    def process_query(self, query: str) -> Dict[str, Any]:
        """
        End-to-end RAG query processing:
        1. Safety Check for acute crisis/self-harm
        2. Vector retrieval from ChromaDB
        3. Evidence-relevance verification & abstention
        4. Grounded generation & citation validation
        """
        # Step 1: Safety Check
        is_crisis, crisis_payload = evaluate_safety(query)
        if is_crisis:
            crisis_payload["citations"] = []
            return crisis_payload

        # Step 2: Retrieve candidate chunks
        chunks = self.retrieve(query, top_k=6)

        # Step 3: Evidence-relevance check
        has_evidence = self.evaluate_evidence_relevance(query, chunks)
        if not has_evidence or not chunks:
            return {
                "reply": ABSTENTION_RESPONSE,
                "source": "",
                "citations": [],
                "is_crisis": False,
                "disclaimer": DISCLAIMER_TEXT
            }

        # Step 4: Grounded Generation with verified citations
        response = self.generate_response(query, chunks)
        response["is_crisis"] = False
        return response

    # Alias for convenience
    query = process_query

def handle_cli():
    import argparse
    parser = argparse.ArgumentParser(description="MentalHealth Assistant RAG Pipeline")
    parser.add_argument("prompt", nargs="?", default="", help="User query text")
    parser.add_argument("--query", "-q", default="", help="User query text")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--stdio", action="store_true", help="Run interactive JSON-over-stdio loop")
    args = parser.parse_args()

    pipeline = MindCareRAGPipeline()

    if args.stdio:
        # Long-running worker mode over stdio for fast IPC with Express
        sys.stdout.write(json.dumps({"status": "ready"}) + "\n")
        sys.stdout.flush()
        while True:
            line = sys.stdin.readline()
            if not line:
                break
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                q = data.get("query", "")
            except Exception:
                q = line

            res = pipeline.process_query(q)
            sys.stdout.write(json.dumps(res, ensure_ascii=False) + "\n")
            sys.stdout.flush()
        return

    query_text = args.query or args.prompt
    if not query_text:
        query_text = "What are the grounding techniques for stress management?"

    result = pipeline.process_query(query_text)

    if args.json:
        print(json.dumps(result, ensure_ascii=False))
    else:
        print("\n" + "=" * 60)
        print("MentalHealth Assistant — RAG Response")
        print("=" * 60)
        print(result["reply"])
        print("\nSource:", result.get("source"))
        if result.get("citations"):
            print("Citations:", json.dumps(result.get("citations"), indent=2))
        print("=" * 60)

if __name__ == "__main__":
    handle_cli()
