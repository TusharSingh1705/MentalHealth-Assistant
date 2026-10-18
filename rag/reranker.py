# Cross-encoder reranker for scoring candidate knowledge passages

from typing import List, Dict, Any

class SimpleReranker:
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        self.model = None

    def _load_model(self):
        if self.model is None:
            try:
                from sentence_transformers import CrossEncoder
                self.model = CrossEncoder(self.model_name)
            except Exception as e:
                # Fallback to lexical overlap score if model cannot be loaded
                self.model = False

    def rerank(self, query: str, candidates: List[Dict[str, Any]], top_k: int = 3) -> List[Dict[str, Any]]:
        if not candidates:
            return []

        self._load_model()

        if self.model:
            pairs = [[query, c.get("text", "")] for c in candidates]
            scores = self.model.predict(pairs)
            for idx, score in enumerate(scores):
                candidates[idx]["rerank_score"] = float(score)
            candidates.sort(key=lambda x: x["rerank_score"], reverse=True)
            return candidates[:top_k]
        else:
            # Fallback lexical scoring
            query_words = set(query.lower().split())
            for c in candidates:
                text_words = set(c.get("text", "").lower().split())
                overlap = len(query_words.intersection(text_words))
                c["rerank_score"] = float(overlap)
            candidates.sort(key=lambda x: x["rerank_score"], reverse=True)
            return candidates[:top_k]
