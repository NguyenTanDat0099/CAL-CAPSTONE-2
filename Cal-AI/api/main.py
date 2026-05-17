import asyncio
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from api.routes.food_analysis import router as food_router
from api.routes.qa import router as qa_router
from api.routes.recipe_dataset import router as recipe_dataset_router
from api.routes.agentic_rag import (
    router as agentic_rag_router,
    get_agentic_rag
)

from typing import Optional
from core.embedding.clip_service import CLIPService
from core.services.retrieval.qdrant_service import QdrantService
from core.services.llm.llm_service import LLMService


_clip = None
_qdrant = None

COLLECTION = "food_text_vectors"


def get_search_services():
    global _clip, _qdrant
    if _clip is None:
        _clip = CLIPService()
    if _qdrant is None:
        _qdrant = QdrantService()
    return _clip, _qdrant


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load heavy artefacts so the first user request doesn't pay
    # the ~60s lazy-load cost (mpnet ~20-30s + ollama model load ~20-30s).
    print("⏳ [startup] warming up models...")
    t0 = time.time()

    try:
        rag = get_agentic_rag()
        # Force lazy generic agent — owns the mpnet TextEmbeddingService used
        # by the main chat path. Without this the first /query pays ~25s
        # SentenceTransformer load cost.
        generic = rag._generic_agent()
        generic.text_embed.embed("khởi động hệ thống")
        generic.qdrant.available_collections()
        # Touch the recipe-side embedder too (used when intent = recipe).
        rag.recipe_agent.rag.text_embed.embed("khởi động công thức")
        print(f"   ✅ AgenticRAG + embeddings ready  ({time.time() - t0:.1f}s)")
    except Exception as e:
        print(f"   ⚠️ AgenticRAG warmup failed: {e}")

    try:
        get_search_services()
        print(f"   ✅ CLIP + Qdrant ready  ({time.time() - t0:.1f}s)")
    except Exception as e:
        print(f"   ⚠️ CLIP/Qdrant warmup failed: {e}")

    async def _warm_llm():
        try:
            await LLMService()._call_llm("hi", temperature=0.0, num_predict=1)
            print(f"   ✅ LLM (ollama) warm  ({time.time() - t0:.1f}s)")
        except Exception as e:
            print(f"   ⚠️ LLM warmup failed: {e}")

    asyncio.create_task(_warm_llm())

    print(f"🚀 [startup] handlers registered (cold-start cost paid in {time.time() - t0:.1f}s)")
    yield
    print("🛑 [shutdown]")


app = FastAPI(lifespan=lifespan)
app.include_router(food_router)
app.include_router(qa_router)
app.include_router(recipe_dataset_router)
app.include_router(agentic_rag_router)


@app.get("/health")
def health():
    return {"status": "ok"}
                                                                                                                                                                                                                    

# =========================
# SEARCH API
# =========================
@app.get("/search")
def search(
    query: str,
    min_calories: Optional[float] = None,
    max_calories: Optional[float] = None,
    top_k: int = 10
):
    clip, qdrant = get_search_services()
    vec = clip.embed_text(query)

    results = qdrant.search(
        collection_name=COLLECTION,
        vector=vec,
        top_k=top_k,
        min_calories=min_calories,
        max_calories=max_calories
    )

    # ===== FORMAT =====
    output = []
    for r in results:
        payload = dict(r.payload or {})
        payload["score"] = r.score
        output.append(payload)

    return output


@app.get("/query")
async def query(
    q: Optional[str] = None,
    question: Optional[str] = Query(default=None),
    session_id: Optional[str] = None,
    conversation_context: Optional[str] = None,
    is_follow_up: Optional[bool] = None
):
    final_query = q or question
    if not final_query:
        raise HTTPException(status_code=422, detail="Missing query parameter `q` or `question`.")

    return await get_agentic_rag().run(
        final_query,
        top_k=6,
        session_id=session_id,
        conversation_context=conversation_context,
        is_follow_up=is_follow_up
    )
