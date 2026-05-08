import httpx
import json
import re
from typing import Any

from config.settings import settings
from core.prompts.agentic_prompts import (
    AGENTIC_SYSTEM_PROMPT,
    build_agentic_answer_prompt,
    build_food_image_answer_prompt,
)


class LLMService:

    def __init__(self):
        self.url = settings.LLM_API_URL
        self.model = settings.LLM_MODEL
        self.backend = settings.LLM_BACKEND.lower().strip()
        self.timeout = settings.LLM_TIMEOUT_SECONDS

    # =========================
    # COMMON CALL
    # =========================
    async def _call_llm(self, prompt, temperature=0.3, num_predict=None):
        if self.backend == "openai":
            return await self._call_openai_compatible(
                prompt=prompt,
                temperature=temperature,
                max_tokens=num_predict or settings.LLM_NUM_PREDICT
            )

        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": AGENTIC_SYSTEM_PROMPT,
            "stream": False,
            "options": {"temperature": temperature}
        }
        if num_predict is not None:
            payload["options"]["num_predict"] = num_predict

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(self.url, json=payload)
                res.raise_for_status()

            data = res.json()

            text = data.get("response") or data.get("message", {}).get("content")

            if not text:
                return {"error": "No response", "raw": data}

            text = text.strip()

            return self._strip_code_fence(text)

        except Exception as e:
            return {"error": str(e)}

    async def _call_openai_compatible(self, prompt, temperature=0.3, max_tokens=650):
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": AGENTIC_SYSTEM_PROMPT
                },
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(self.url, json=payload)
                res.raise_for_status()

            data = res.json()
            text = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content")
            )
            if not text:
                return {"error": "No response", "raw": data}
            return self._strip_code_fence(text.strip())

        except Exception as e:
            return {"error": str(e)}

    def _strip_code_fence(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```[a-zA-Z0-9_-]*", "", text)
            text = text.replace("```", "")
        return text.strip()

    def _extract_json_object(self, text: str):
        text = self._strip_code_fence(text)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("No JSON object found")
        return json.loads(match.group())

    def _safe_value(self, value: Any):
        if isinstance(value, (str, int, float, bool)) or value is None:
            if isinstance(value, str) and len(value) > 240:
                return value[:237] + "..."
            return value

        if isinstance(value, dict):
            return {
                str(k): self._safe_value(v)
                for k, v in value.items()
                if not self._is_noise_key(k) and not self._is_noise_value(v)
            }

        if isinstance(value, (list, tuple)):
            return [self._safe_value(v) for v in value[:12] if not self._is_noise_value(v)]

        return str(value)[:240]

    def _compact_context(self, context, limit=8):
        if not context:
            return []

        compacted = []
        for item in context[:limit]:
            payload = getattr(item, "payload", item)
            if payload is None:
                continue
            compacted.append(self._safe_value(payload))

        return compacted

    def _first_present(self, payload, keys):
        for key in keys:
            value = payload.get(key)
            if value not in (None, ""):
                return key, self._safe_value(value)
        return None, None

    PAYLOAD_DENY_KEYS = {
        "vector", "vectors", "embedding", "embeddings",
        "image", "image_bytes", "image_b64", "image_data", "image_path",
        "image_vector", "text_vector", "clip_vector", "openai_vector",
    }

    PAYLOAD_NAME_KEYS = (
        "title", "Name", "Shrt_Desc", "recipe_name", "name", "dish_name",
        "food", "food_name", "product_name",
        "ingredient_name",  # nutrition5k
        "Activity, Exercise or Sport (1 hour)", "Activity", "Subtype",
        "Drink", "Drink_Name", "beverage_name", "Beverage",
        "Fruit", "Vegetable", "Disease", "Habit",
    )

    PAYLOAD_PRIORITY_KEYS = (
        # ingredients / composition (multiple shapes across collections)
        "ingredients", "ingredients_list", "cleaned_ingredients", "cleaned_ingredients_list",
        "ingredients_search", "Ingredients", "ingredient_list",
        "ingredient_name",  # nutrition5k row-level
        "description", "Long_Desc", "recipe_steps", "directions", "instructions",
        "instructions_preview",  # recipes_64k / food_recipe_images_text
        "image_caption",
        # macros (numeric) — top-level + nutrition5k _g aliases
        "calories", "Calories", "Caloric Value", "Energ_Kcal", "energy", "energy_kcal",
        "energy-kcal_100g", "energy_100g",
        "protein", "Protein", "Protein_(g)", "proteins_100g", "protein_g",
        "carbohydrate", "carbs", "Carbohydrates", "Carbohydrt_(g)", "carbohydrates_100g", "carbs_g",
        "fat", "Fat", "total_fat", "Lipid_Tot_(g)", "fat_100g", "fat_g",
        "fiber", "Fiber_TD_(g)", "fiber_100g", "Sugar_Tot_(g)", "sugar_100g",
        "Sodium_(mg)", "sodium_100g", "salt_100g",
        # nested nutrition dict (Nutrition5k) — preserved as-is so LLM sees full block
        "nutrition",
        # micros / vitamins
        "Vit_C_(mg)", "Vit_A_RAE", "Vit_A_IU", "Vit_D_IU", "Vit_E_(mg)",
        "Calcium_(mg)", "Iron_(mg)", "Magnesium_(mg)", "Potassium_(mg)",
        "Zinc_(mg)", "Cholestrl_(mg)",
        # serving
        "serving_size", "GmWt_Desc1", "GmWt_1", "portion",
        "mass_g", "mass", "weight_g",
        # taxonomy / recipe meta
        "category", "cuisine", "cook_time", "meal_slot", "comparison_term",
        "cooking_method", "record_type", "dish_id",
        "source_collection", "source_dataset", "source_table",
    )

    def _is_noise_key(self, key):
        if not key:
            return True
        key_lower = str(key).lower()
        if key_lower in self.PAYLOAD_DENY_KEYS:
            return True
        if "embedding" in key_lower or key_lower.endswith("_vector") or key_lower.endswith("_emb"):
            return True
        return False

    def _is_noise_value(self, value):
        if value in (None, "", [], {}):
            return True
        if isinstance(value, (list, tuple)) and len(value) > 0:
            head = value[0]
            if isinstance(head, (int, float)) and len(value) >= 32:
                return True  # numeric vector dump
        return False

    def _shrink_list(self, value, item_cap=12, str_cap=200):
        result = []
        for item in value[:item_cap]:
            if isinstance(item, dict):
                result.append({
                    str(k): self._safe_value(v)
                    for k, v in item.items()
                    if not self._is_noise_key(k) and not self._is_noise_value(v)
                })
            elif isinstance(item, str):
                result.append(item[:str_cap])
            else:
                result.append(self._safe_value(item))
        return result

    def _compact_agentic_context(self, context, limit=6, max_fields=32):
        if not context:
            return []

        compacted = []
        for raw_item in context[:limit]:
            payload = getattr(raw_item, "payload", raw_item) or {}
            if not isinstance(payload, dict):
                compacted.append(self._safe_value(payload))
                continue

            item = {}
            name_key, name_value = self._first_present(payload, self.PAYLOAD_NAME_KEYS)
            if name_key:
                item["name"] = name_value

            def _add(key, value):
                if key in item:
                    return
                if self._is_noise_key(key) or self._is_noise_value(value):
                    return
                if isinstance(value, (list, tuple)):
                    item[key] = self._shrink_list(value)
                elif isinstance(value, dict):
                    item[key] = {
                        str(k): self._safe_value(v)
                        for k, v in value.items()
                        if not self._is_noise_key(k) and not self._is_noise_value(v)
                    }
                else:
                    item[key] = self._safe_value(value)

            # Priority pass: load high-value fields first so they survive max_fields cap.
            for key in self.PAYLOAD_PRIORITY_KEYS:
                if key == name_key:
                    continue
                if key in payload:
                    _add(key, payload[key])
                if len(item) >= max_fields:
                    break

            # Fallback pass: any remaining payload field within budget.
            if len(item) < max_fields:
                for key, value in payload.items():
                    if key == name_key or key in item:
                        continue
                    _add(key, value)
                    if len(item) >= max_fields:
                        break

            compacted.append(item)

        return compacted

    # Aliases used to extract macros from heterogeneous payload shapes.
    # Mirror agentic_rag.MACRO_*_KEYS so the LLM serializer agrees with the agent.
    METRIC_KEY_GROUPS = (
        ("kcal", (
            "calories", "Calories", "Caloric Value", "kcal",
            "Energ_Kcal", "energy", "energy_kcal",
            "energy-kcal_100g", "energy_100g",
        )),
        ("protein", (
            "protein", "Protein", "Protein_(g)", "proteins_100g",
            "protein_g", "protein_grams",
        )),
        ("carb", (
            "carbohydrate", "carbs", "Carbohydrates", "Carbohydrt_(g)",
            "carbohydrates_100g", "carbs_g", "carb", "carbs_grams",
        )),
        ("fat", (
            "fat", "Fat", "total_fat", "Lipid_Tot_(g)", "fat_100g",
            "fat_g", "fat_grams",
        )),
        ("serving", (
            "serving_size", "GmWt_Desc1", "GmWt_1", "portion",
            "mass_g", "mass", "weight_g", "weight",
        )),
    )

    def _lookup_payload_value(self, item, keys):
        """Pull first present value among `keys`, with fallback to nested
        `nutrition` dict (Nutrition5k stores macros under `payload['nutrition']`).
        """
        nested = item.get("nutrition") if isinstance(item.get("nutrition"), dict) else None
        for key in keys:
            value = item.get(key)
            if value in (None, "") and nested is not None:
                value = nested.get(key)
            if value not in (None, ""):
                return value
        return None

    def _context_lines(self, context):
        lines = []
        for index, item in enumerate(context or [], start=1):
            if not isinstance(item, dict):
                lines.append(f"{index}. {item}")
                continue

            name = (
                item.get("name")
                or item.get("food")
                or item.get("title")
                or item.get("ingredient_name")
                or item.get("Activity")
                or item.get("Activity, Exercise or Sport (1 hour)")
                or "item"
            )
            metrics = []
            for label, keys in self.METRIC_KEY_GROUPS:
                value = self._lookup_payload_value(item, keys)
                if value is not None:
                    metrics.append(f"{label}={value}")
            lines.append(f"{index}. {name}: {', '.join(metrics) if metrics else 'no numeric metrics'}")
        return "\n".join(lines)

    def _first_metric(self, item, keys):
        value = self._lookup_payload_value(item, keys)
        return value if value is not None else "—"

    def _context_metric_table(self, context):
        rows = ["name | serving | kcal | protein | carb | fat"]
        metric_lookup = dict(self.METRIC_KEY_GROUPS)
        for item in context or []:
            if not isinstance(item, dict):
                continue
            name = (
                item.get("name")
                or item.get("food")
                or item.get("title")
                or item.get("ingredient_name")
                or item.get("Activity")
                or item.get("Activity, Exercise or Sport (1 hour)")
                or "item"
            )
            rows.append(
                " | ".join(str(value) for value in [
                    name,
                    self._first_metric(item, metric_lookup["serving"]),
                    self._first_metric(item, metric_lookup["kcal"]),
                    self._first_metric(item, metric_lookup["protein"]),
                    self._first_metric(item, metric_lookup["carb"]),
                    self._first_metric(item, metric_lookup["fat"]),
                ])
            )
        return "\n".join(rows)

    def _has_nutrition_values(self, nutrition):
        if not isinstance(nutrition, dict):
            return False
        for key in ["calories", "kcal", "protein", "carbs", "carbohydrate", "fat"]:
            value = nutrition.get(key)
            if value not in (None, "", 0):
                return True
        return False

    def _food_image_lacks_nutrition(self, analysis):
        if not isinstance(analysis, dict):
            return True
        summary = analysis.get("nutrition_summary") or {}
        return (
            analysis.get("nutrition_source") == "not_available"
            and not self._has_nutrition_values(analysis.get("estimated_nutrition"))
            and not self._has_nutrition_values(summary.get("estimated_visible_portion"))
        )

    def _text_has_unsupported_nutrition_numbers(self, text):
        normalized = str(text or "").lower()
        if re.search(r"[\u4e00-\u9fff]", normalized):
            return True
        if not re.search(r"\d", normalized):
            return False
        nutrition_terms = [
            "kcal", "calo", "calorie", "calories", "protein", "đạm",
            "carb", "carbs", "carbonhydrate", "carbohydrate", "fat",
            "chất béo", "gram", "grams", "g ", "卡路里", "蛋白",
        ]
        return any(term in normalized for term in nutrition_terms)

    def _grounded_food_image_answer(self, question, analysis):
        analysis = analysis if isinstance(analysis, dict) else {}
        vision = analysis.get("vision_detail") or {}
        dish = analysis.get("dish_name") or "món trong ảnh"
        confidence = analysis.get("confidence")
        confidence_text = ""
        if isinstance(confidence, (int, float)):
            confidence_text = f" (độ tin cậy khoảng {round(float(confidence) * 100)}%)"

        ingredients = vision.get("ingredients") or []
        ingredient_text = ""
        if ingredients:
            ingredient_text = " Mình thấy/có thể suy luận các thành phần chính: " + ", ".join(
                str(item) for item in ingredients[:4]
            ) + "."

        if self._food_image_lacks_nutrition(analysis):
            return (
                f"Khả năng cao đây là {dish}{confidence_text}.{ingredient_text} "
                "Mình chưa có đủ dữ liệu khẩu phần từ ảnh để ước tính calories và macro đáng tin cậy. "
                "Bạn cho mình biết khẩu phần khoảng bao nhiêu bát/gram hoặc thành phần chính nhé?"
            ).strip()

        nutrition = analysis.get("estimated_nutrition") or (
            (analysis.get("nutrition_summary") or {}).get("estimated_visible_portion") or {}
        )
        metrics = []
        for label, key, unit in [
            ("calories", "calories", "kcal"),
            ("protein", "protein", "g"),
            ("carb", "carbs", "g"),
            ("fat", "fat", "g"),
        ]:
            value = nutrition.get(key)
            if value not in (None, "", 0):
                metrics.append(f"{label}: {value} {unit}")
        metric_text = "; ".join(metrics)
        return (
            f"Khả năng cao đây là {dish}{confidence_text}.{ingredient_text} "
            f"Ước tính cho phần nhìn thấy: {metric_text}."
        ).strip()

    def _is_low_value_answer(self, text):
        normalized = str(text or "").strip()
        if len(normalized) < 45:
            return True
        table_tokens = normalized.replace(" ", "").lower()
        return table_tokens in {
            "món|khẩuphần|kcal|p|c|f",
            "|món|khẩuphần|kcal|p|c|f|",
        }

    async def _retry_agentic_short(self, query, intent, compact_context, citations):
        prompt = f"""
Cau hoi: {query}
Intent: {intent}
Bang du lieu duoc phep dung, khong duoc sua so:
{self._context_metric_table(compact_context)}

Hay tra loi bang tieng Viet tu nhien.
Neu lap thuc don: chuyen tung dong trong bang du lieu thanh Markdown table voi cot Mon | Khau phan | kcal | Protein | Carb | Fat.
Chi copy so lieu tu bang du lieu. Khong tinh lai. Khong them mon moi. Khong nhac 7700 tru khi cau hoi ve tang/giam can.
Nguon: {json.dumps((citations or [])[:3], ensure_ascii=False, separators=(",", ":"))}
""".strip()
        text = await self._call_llm(
            prompt,
            temperature=0.2,
            num_predict=min(260, max(settings.LLM_NUM_PREDICT, 220))
        )
        if isinstance(text, dict):
            return None
        return text

    async def answer_food_image(self, question, analysis):
        prompt = build_food_image_answer_prompt(question=question, analysis=analysis)
        text = await self._call_llm(
            prompt,
            temperature=0.2,
            num_predict=settings.LLM_NUM_PREDICT
        )
        if isinstance(text, dict):
            return None
        return text

    async def answer_agentic(
        self,
        query,
        intent,
        context,
        citations,
        conversation_context=None,
        user_profile_text=None
    ):
        context_limit = 12 if intent == "meal_planning" else 4
        compact_context = self._compact_agentic_context(context, limit=context_limit)
        prompt = build_agentic_answer_prompt(
            query=query,
            intent=intent,
            context=compact_context,
            citations=citations,
            conversation_context=conversation_context,
            user_profile_text=user_profile_text
        )
        if intent == "meal_planning":
            num_predict = max(settings.LLM_NUM_PREDICT, 1100)
        elif intent == "weight_projection":
            num_predict = max(settings.LLM_NUM_PREDICT, 500)
        elif intent == "nutrition_qa":
            num_predict = max(settings.LLM_NUM_PREDICT, 600)
        else:
            num_predict = max(settings.LLM_NUM_PREDICT, 400)
        text = await self._call_llm(
            prompt,
            temperature=0.25,
            num_predict=num_predict
        )
        if isinstance(text, dict):
            return None
        if self._is_low_value_answer(text):
            retry_text = await self._retry_agentic_short(
                query=query,
                intent=intent,
                compact_context=compact_context,
                citations=citations
            )
            if retry_text and not self._is_low_value_answer(retry_text):
                return retry_text
        return text

    # =========================
    # TEXT → QA
    # =========================
    async def answer_question(self, question, context):
        compact_context = self._compact_context(context, limit=10)

        prompt = f"""
CÂU HỎI:
{question}

DỮ LIỆU TRUY XUẤT:
{json.dumps(compact_context, ensure_ascii=False)}

Trả lời:
"""

        text = await self._call_llm(
            prompt,
            temperature=0.25,
            num_predict=settings.LLM_NUM_PREDICT
        )

        if isinstance(text, dict):
            return {
                "question": question,
                "answer": "Không thể tạo câu trả lời vì LLM đang lỗi hoặc không phản hồi.",
                "error": text,
                "context_used": compact_context[:5],
                "format": "messenger_text"
            }

        return {
            "question": question,
            "answer": text,
            "context_used": compact_context[:5],
            "format": "messenger_text"
        }
