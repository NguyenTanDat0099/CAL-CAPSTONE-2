"""Find a non-empty sample for collections that returned empty."""
import os, sys, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv; load_dotenv(ROOT / ".env")
from qdrant_client import QdrantClient

c = QdrantClient(url=os.environ["QDRANT_URL"], api_key=os.environ["QDRANT_API_KEY"], timeout=60)
for name in ["food_nutrition", "beverage_text_vectors_768", "diet_recommendations_vectors", "food_fruit_vectors_768"]:
    print(f"\n## {name}")
    pts, _ = c.scroll(name, limit=3, with_payload=True, with_vectors=False)
    for p in pts:
        s = json.dumps(p.payload, ensure_ascii=False, default=str)
        print(f"  - {s[:400]}")
