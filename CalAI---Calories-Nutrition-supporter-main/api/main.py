import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

app = FastAPI(title="CalAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy service references
_clip_service = None
_qdrant_service = None
_search_service = None
_pipeline = None

COLLECTION = "food_text_vectors"


def get_clip():
    global _clip_service
    if _clip_service is None:
        from core.services.clip_service import CLIPService
        _clip_service = CLIPService()
    return _clip_service


def get_qdrant():
    global _qdrant_service
    if _qdrant_service is None:
        from core.services.qdrant_service import QdrantService
        _qdrant_service = QdrantService()
    return _qdrant_service


def get_search():
    global _search_service
    if _search_service is None:
        from core.services.search_service import SearchService
        _search_service = SearchService()
    return _search_service


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        from core.services.query_pipeline import QueryPipeline
        _pipeline = QueryPipeline()
    return _pipeline


# =========================
# HEALTH CHECK
# =========================
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "CalAI API",
        "clip_available": _clip_service is not None,
        "qdrant_available": _qdrant_service is not None,
    }


# =========================
# QUERY - AI Chatbot endpoint
# =========================
@app.get("/query")
def query(q: str):
    try:
        pipeline = get_pipeline()
        return pipeline.run(q)
    except Exception as e:
        return {
            "type": "text",
            "data": [],
            "error": str(e)
        }


# =========================
# SEARCH - Vector search endpoint
# =========================
@app.get("/search")
def search(
    query: str,
    min_calories: Optional[float] = None,
    max_calories: Optional[float] = None,
    top_k: int = 10
):
    try:
        clip = get_clip()
        qdrant = get_qdrant()

        try:
            vec = clip.embed_text(query)
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"CLIP embedding unavailable: {str(e)}"
            )

        filters = []
        if min_calories is not None:
            filters.append({"key": "calories", "range": {"gte": min_calories}})
        if max_calories is not None:
            filters.append({"key": "calories", "range": {"lte": max_calories}})

        query_filter = {"must": filters} if filters else None

        try:
            results = qdrant.client.search(
                collection_name=COLLECTION,
                query_vector=vec,
                limit=top_k,
                query_filter=query_filter,
                with_payload=True
            )
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"Qdrant unavailable: {str(e)}"
            )

        output = []
        for r in results:
            payload = dict(r.payload) if hasattr(r, 'payload') else {}
            payload["score"] = r.score
            output.append(payload)

        return output

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")
