from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance
from config.settings import settings

client = QdrantClient(
    url=settings.qdrant_url,
    api_key=settings.qdrant_api_key
)

collections = [
    "food_image_vectors",
    "food_text_vectors",
    "beverage_vectors",
    "exercise_vectors",
    "lifestyle_vectors"
]

for col in collections:
    client.recreate_collection(
        collection_name=col,
        vectors_config=VectorParams(
            size=512,
            distance=Distance.COSINE
        )
    )

print("✅ Qdrant initialized")