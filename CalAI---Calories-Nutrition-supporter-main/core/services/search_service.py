import pandas as pd


class SearchService:

    def __init__(self):
        self._clip = None
        self._qdrant = None

    @property
    def clip(self):
        if self._clip is None:
            from core.services.clip_service import CLIPService
            self._clip = CLIPService()
        return self._clip

    @property
    def qdrant(self):
        if self._qdrant is None:
            from core.services.qdrant_service import QdrantService
            self._qdrant = QdrantService()
        return self._qdrant

    def search(self, query, collection="food_text_vectors", limit=50):
        vector = self.clip.embed_text(query)

        results = self.qdrant.client.search(
            collection_name=collection,
            query_vector=vector,
            limit=limit
        )

        data = []

        for r in results:
            item = dict(r.payload)
            item.pop("image_path", None)
            item["score"] = r.score
            data.append(item)

        df = pd.DataFrame(data)

        if df.empty:
            return df

        df = self._deduplicate(df)
        df = self.rerank(df, query)

        return df.reset_index(drop=True)

    def rerank(self, df, query):
        if df.empty:
            return df

        q = query.lower()

        df["boost"] = df.apply(
            lambda row: sum(
                1 for v in row.values
                if isinstance(v, str) and q in v.lower()
            ),
            axis=1
        )

        df["nutrition_score"] = (
            df.get("protein", 0) / (df.get("calories", 1) + 1)
        )

        df["final_score"] = (
            df["score"] +
            df["boost"] * 0.2 +
            df["nutrition_score"] * 0.3
        )

        return df.sort_values("final_score", ascending=False)

    def _deduplicate(self, df: pd.DataFrame):
        if df.empty:
            return df

        if "id" in df.columns:
            df = df.drop_duplicates(subset=["id"])
        else:
            subset_cols = [
                col for col in ["food_name", "calories", "protein", "carb", "fat"]
                if col in df.columns
            ]
            if subset_cols:
                df = df.drop_duplicates(subset=subset_cols)

        return df.reset_index(drop=True)
