import json


AGENTIC_SYSTEM_PROMPT = (
    "Bạn là CalAI Pro — trợ lý dinh dưỡng. Trả lời tự nhiên, ngắn gọn, đúng ngôn ngữ user (VI/EN).\n"
    "Grounding bắt buộc: chỉ dùng tên món/số liệu trong CONTEXT. Không bịa. "
    "Thiếu dữ liệu thì nói rõ và hỏi 1 câu cụ thể.\n"
    "Bảng Markdown: mỗi ô là số đã tính sẵn (vd `630`), không để công thức (`210*3`).\n"
    "Cấm LaTeX/MathJax (\\[, \\frac, $$). Viết toán bằng ký tự thường.\n"
    "Exercise: calories = tiêu hao khi tập, không bàn diet trừ khi user hỏi.\n"
    "Weight projection: Δkg ≈ (kcal_in - TDEE) × ngày / 7700, ghi rõ là ước tính."
)


_INTENT_GUIDE = {
    "meal_planning": (
        "Lập thực đơn CHỈ từ món trong context. Output bảng: Món|Khẩu phần|kcal|P(g)|C(g)|F(g). "
        "Nhiều ngày: xoay vòng món, tách bảng theo bữa (sáng/trưa/tối/đồ uống) khi context có. "
        "Thiếu món cho 1 bữa: ghi 'Context có {n} món cho bữa này'."
    ),
    "nutrition_qa": (
        "Trả số + unit chính xác từ context. Nếu context chỉ có /100g mà user hỏi khẩu phần khác: "
        "giải thích và hỏi khối lượng thực tế. Không tự quy đổi nếu thiếu khối lượng."
    ),
    "ingredient_comparison": (
        "Bảng Markdown so sánh theo tiêu chí user hỏi. Thiếu chỉ số: ghi '—'. "
        "Cuối bảng tóm tắt 1 câu 'Nên chọn X nếu ưu tiên Y'."
    ),
    "weight_projection": (
        "Δkg ≈ (kcal_in - TDEE) × ngày / 7700. Thiếu TDEE/kcal_in: hỏi 1 câu để bổ sung. "
        "Mục tiêu phi thực tế (>1kg/tuần): từ chối, đưa giới hạn an toàn 0.5–1kg/tuần. "
        "Thêm note: 'Đây là ước tính lý thuyết.'"
    ),
    "exercise_qa": (
        "Calories = tiêu hao khi vận động. Không nhắc diet/cân nặng trừ khi user hỏi. "
        "Nhiều mức intensity: hỏi user tập ở mức nào trước."
    ),
}


def build_agentic_answer_prompt(
    query: str,
    intent: str,
    context,
    citations,
    conversation_context=None,
    user_profile_text=None,
) -> str:
    allowed_names = []
    for item in context or []:
        if not isinstance(item, dict):
            continue
        name = (
            item.get("name")
            or item.get("title")
            or item.get("Name")
            or item.get("Shrt_Desc")
            or item.get("Activity")
            or item.get("Activity, Exercise or Sport (1 hour)")
        )
        if name:
            allowed_names.append(str(name))

    name_cap = 24 if intent == "meal_planning" else 8
    guidance = _INTENT_GUIDE.get(
        intent,
        "Trả lời ngắn dựa trên context, ưu tiên chính xác hơn dài."
    )

    compact = json.dumps(context or [], ensure_ascii=False, separators=(",", ":"))
    cite_compact = json.dumps((citations or [])[:5], ensure_ascii=False, separators=(",", ":"))
    names = json.dumps(allowed_names[:name_cap], ensure_ascii=False, separators=(",", ":"))

    parts = [
        f"Intent: {intent}",
        f"Hướng dẫn: {guidance}",
        f"Tên được phép nhắc: {names}",
    ]
    if user_profile_text:
        parts.append(f"Hồ sơ user: {user_profile_text}")
    if conversation_context:
        parts.append(f"Lịch sử: {conversation_context}")
    parts.append(f"CONTEXT: {compact}")
    parts.append(f"CITATION: {cite_compact}")
    parts.append(f"Câu hỏi: {query}")
    parts.append("Trả lời:")
    return "\n".join(parts)


FOOD_VISION_PROMPT = (
    "Bạn là CalAI Vision Pro — phân tích ảnh thực phẩm.\n"
    "Quy tắc: bằng chứng trực quan > tên file > suy luận. Phân biệt visible / inferred / unknown. "
    "Dinh dưỡng là ƯỚC TÍNH cho phần nhìn thấy. Không chẩn đoán y khoa.\n"
    "CHỈ trả về JSON hợp lệ (không markdown, không text ngoài JSON). "
    "Number dùng null nếu không xác định. Confidence ∈ [0,1] làm tròn 2 chữ số.\n"
    "Schema:\n"
    "{\n"
    '  "image_quality":{"clarity":"good|fair|poor","lighting":"good|fair|poor",'
    '"angle":"top|side|angled|unclear","occlusion":"none|partial|heavy"},\n'
    '  "dish_name":"...|null",\n'
    '  "possible_dishes":[{"name":"...","probability":0.0,"visual_evidence":"..."}],\n'
    '  "description":"mô tả ngắn",\n'
    '  "image_observations":["..."],\n'
    '  "visible_vs_inferred":{"visible":[],"inferred":[],"not_visible":[]},\n'
    '  "ingredients":["..."],\n'
    '  "category":"main|side|snack|dessert|drink|mixed|unknown",\n'
    '  "visual_form":"bowl|plate|noodle_soup|soup|salad|sandwich|pizza|sushi|drink|dessert|mixed_meal|unknown",\n'
    '  "portion_description":"...",\n'
    '  "portion_estimation":{"servings":null,"estimated_grams":null,"volume_or_count":"...",'
    '"method":"visual_reference|standard_serving|count_based|unknown","uncertainty":"low|medium|high"},\n'
    '  "sub_items":[{"name":"...","count":0,"estimated_amount":"...","confidence":0.0}],\n'
    '  "nutrition_estimate":{"calories":null,"protein":null,"carbs":null,"fat":null,'
    '"fiber":null,"sugar":null,"sodium_mg":null,"basis":"...","reliability_note":"..."},\n'
    '  "health_context":{"cooking_method":"grilled|fried|steamed|boiled|raw|unknown",'
    '"sauce_or_condiment":"...","energy_density":"low|moderate|high|unknown",'
    '"macro_balance":"protein_forward|carb_forward|fat_forward|balanced|unknown"},\n'
    '  "dietary_assessment":{"health_score_0_10":null,"strengths":[],"concerns":[],'
    '"suitable_for":[],"caution_for":[]},\n'
    '  "risk_flags":[{"risk":"...","severity":"low|medium|high","reason":"..."}],\n'
    '  "recommendations":{"healthier_adjustments":[]},\n'
    '  "table_rows":[{"metric":"Calories","value":null,"unit":"kcal","reliability":"low|medium|high"}],\n'
    '  "uncertainty":{"level":"low|medium|high","reasons":[],"needs_user_input":[]},\n'
    '  "confidence":0.0\n'
    "}\n"
    "Trả về JSON ngay, không nói gì khác."
)


_NUTRITION_KEYS = (
    ("calories", "kcal"),
    ("protein", "g"),
    ("carbs", "g"),
    ("fat", "g"),
    ("fiber", "g"),
    ("sodium_mg", "mg"),
)


def _summarize_analysis(analysis: dict) -> dict:
    if not isinstance(analysis, dict):
        return {}
    summary = {}
    for key in ("dish_name", "description", "category", "visual_form",
                "portion_description", "confidence"):
        value = analysis.get(key)
        if value not in (None, "", []):
            summary[key] = value

    ingredients = analysis.get("ingredients") or []
    if isinstance(ingredients, list) and ingredients:
        summary["ingredients"] = ingredients[:8]

    nutrition = analysis.get("nutrition_estimate") or analysis.get("estimated_nutrition") or {}
    if isinstance(nutrition, dict):
        compact = {}
        for key, _ in _NUTRITION_KEYS:
            value = nutrition.get(key)
            if value not in (None, ""):
                compact[key] = value
        if nutrition.get("basis"):
            compact["basis"] = nutrition["basis"]
        if compact:
            summary["nutrition"] = compact

    uncertainty = analysis.get("uncertainty") or {}
    if isinstance(uncertainty, dict) and uncertainty.get("level"):
        summary["uncertainty"] = uncertainty.get("level")

    possible = analysis.get("possible_dishes") or []
    if isinstance(possible, list) and possible:
        summary["possible_dishes"] = [
            {"name": p.get("name"), "probability": p.get("probability")}
            for p in possible[:3]
            if isinstance(p, dict) and p.get("name")
        ]
    return summary


def build_food_image_answer_prompt(question: str, analysis: dict) -> str:
    summary = _summarize_analysis(analysis or {})
    summary_json = json.dumps(summary, ensure_ascii=False, separators=(",", ":"))
    user_q = question or "Đây là món gì? Hãy phân tích dinh dưỡng và tư vấn."
    return (
        "Trả lời tự nhiên (tiếng Việt) dựa CHỈ trên dữ liệu phân tích ảnh dưới đây. "
        "Nếu nutrition null/thiếu: nói rõ chưa đủ dữ liệu và hỏi user mô tả khẩu phần. "
        "Không bịa số/thành phần ngoài dữ liệu.\n"
        f"User hỏi: {user_q}\n"
        f"Phân tích: {summary_json}\n"
        "Trả lời:"
    )
