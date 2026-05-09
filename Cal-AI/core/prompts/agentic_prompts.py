import json


AGENTIC_SYSTEM_PROMPT = (
    "Bạn là CalAI Pro — trợ lý dinh dưỡng. Trả lời tự nhiên, ngắn gọn, đúng ngôn ngữ user (VI/EN).\n"
    "Grounding bắt buộc: chỉ dùng tên món/số liệu trong CONTEXT. Không bịa. "
    "Thiếu dữ liệu thì nói rõ và hỏi 1 câu cụ thể.\n"
    "Bảng Markdown: mỗi ô là số đã tính sẵn (vd `630`), không để công thức (`210*3`).\n"
    "Cấm LaTeX/MathJax (\\[, \\frac, $$). Viết toán bằng ký tự thường.\n"
    "Exercise: calories = tiêu hao khi tập, không bàn diet trừ khi user hỏi.\n"
    "Weight projection: Δkg ≈ (kcal_in - TDEE) × ngày / 7700, ghi rõ là ước tính.\n"
    "CÁ NHÂN HÓA: nếu prompt có `Hồ sơ user`, BẮT BUỘC dùng age/gender/weight/activityLevel/goal/dailyCalories "
    "để tinh chỉnh khuyến nghị. Quy tắc theo nhóm tuổi:\n"
    "- <6 tuổi: hạn chế muối/đường, không cafein/đồ uống có ga, khẩu phần nhỏ chia 5-6 bữa, ưu tiên sữa & rau củ mềm.\n"
    "- 6-12: tăng canxi/protein cho tăng trưởng (sữa, trứng, cá), tránh đồ chiên rán nhiều, giới hạn snack đóng gói.\n"
    "- 13-18: nhu cầu kcal/protein cao (1.0-1.4g protein/kg), bổ sung sắt (đặc biệt nữ kỳ kinh), canxi.\n"
    "- 19-50: theo goal — giảm cân: deficit 300-500 kcal & protein cao; tăng cơ: surplus 200-400 kcal & 1.6-2.2g protein/kg; duy trì: TDEE.\n"
    "- 51-65: giảm carb tinh chế, tăng chất xơ & omega-3, hạn chế natri (<2000mg/ngày), bổ sung vitamin D.\n"
    "- >65: protein cao hơn (1.0-1.2g/kg) chống sarcopenia, mềm/dễ nhai, đủ nước, bổ sung B12.\n"
    "Quy tắc theo activityLevel: sedentary → kcal & carb thấp; light → vừa; moderate → carb-protein cân bằng; "
    "active/very_active → ưu tiên carb phức + protein, thêm bữa phụ pre/post-workout. "
    "Nếu user_profile có dailyCalories: tổng kcal thực đơn nên ±10% mục tiêu, ghi rõ % so với target. "
    "Nếu thiếu hồ sơ: giả định người lớn 19-50, sedentary, mục tiêu duy trì — và nói rõ giả định này.\n"
    "MEMORY DÀI HẠN: nếu hồ sơ có 'Món hay ăn' → ưu tiên xuất hiện trong gợi ý. "
    "'Né' / 'Không thích' → tránh khi có thể, nếu phải dùng phải báo trước. "
    "'Dị ứng' → TUYỆT ĐỐI không gợi ý món chứa nguyên liệu đó, kể cả dạng biến tấu."
)


_INTENT_GUIDE = {
    "meal_planning": (
        "Lập thực đơn CHỈ từ món trong context. Output BẢNG kết hợp nhiều món/bữa (combo), KHÔNG 1 món/bữa.\n"
        "Yêu cầu số món tối thiểu mỗi bữa: sáng ≥2, trưa ≥3, tối ≥3, đồ uống 1-2. "
        "Nếu context không đủ món cho 1 bữa: ghi rõ 'Context chỉ có {n} món cho bữa này, gợi ý bổ sung: ...' và đề xuất nhóm món chung (vd: 'thêm 1 phần rau xanh').\n"
        "Cấu trúc bảng: cột Bữa | Món | Khẩu phần | kcal | P(g) | C(g) | F(g). Một bữa chiếm nhiều dòng liền nhau, dòng đầu ghi tên bữa, các dòng sau để '↳' ở cột Bữa.\n"
        "SAU bảng, với MỖI món thêm 1 dòng ngắn: '• [Tên món]: thành phần chính (a, b, c); nổi bật về [protein/chất xơ/vitamin...]'. "
        "Lấy thành phần từ trường ingredients/description/cleaned_ingredients trong context — nếu context không có thì ghi 'chưa có dữ liệu thành phần'.\n"
        "Cuối cùng: tổng kcal/ngày, so với mục tiêu user (nếu có dailyCalories trong hồ sơ) và 1 câu nhận xét cân bằng dinh dưỡng.\n"
        "Nhiều ngày: tách bảng theo từng ngày (Ngày 1, Ngày 2...), xoay vòng món để tránh lặp."
    ),
    "nutrition_qa": (
        "Trả số + unit chính xác từ context. Nếu context chỉ có /100g mà user hỏi khẩu phần khác: "
        "giải thích và hỏi khối lượng thực tế. Không tự quy đổi nếu thiếu khối lượng.\n"
        "Khi context có các trường ingredients/cleaned_ingredients/description/Long_Desc/recipe_steps: "
        "trình bày 3 phần — (1) Số liệu dinh dưỡng chính (kcal, P/C/F), (2) Thành phần & nguyên liệu chính (lọc ingredients trong context, gộp theo nhóm), "
        "(3) Vi chất nổi bật (chỉ liệt kê fields có giá trị: Vit_C, Vit_A_RAE, Calcium_(mg), Iron_(mg), Sodium_(mg), Fiber_TD_(g), Sugar_Tot_(g), v.v. — KHÔNG bịa nếu thiếu).\n"
        "Bullet hoặc bảng tùy độ rộng dữ liệu. Đừng nhắc lại tên trường raw kiểu `Energ_Kcal` cho user — dịch sang tiếng Việt thân thiện."
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
        "Calories = tiêu hao khi vận động. Không nhắc diet/cân nặng trừ khi user hỏi.\n"
        "Nếu hồ sơ user có age/activityLevel: đề xuất bài tập + cường độ phù hợp. "
        "Quy tắc: <12 → vận động vui chơi 60'/ngày, không nâng tạ nặng; 13-18 → tập compound nhẹ + cardio; "
        "19-50 → đầy đủ cardio + strength theo goal; 51-65 → ưu tiên cardio low-impact + mobility; "
        ">65 → đi bộ, bơi, yoga, tập thăng bằng. "
        "ActivityLevel sedentary → bắt đầu 15-20'/ngày, tăng dần; active/very_active → cường độ trung-cao 45-60'/ngày.\n"
        "Nếu user không nói intensity và hồ sơ thiếu: hỏi 1 câu trước khi tính kcal."
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

    name_cap = 40 if intent == "meal_planning" else 8
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
    "Quy tắc thứ tự ưu tiên: bằng chứng trực quan > VISION_EVIDENCE (kết quả "
    "classifier CLIP/Qdrant đã chạy trên ảnh, được cung cấp bên dưới) > tên file > suy luận. "
    "VISION_EVIDENCE LÀ ĐẦU RA của một mô hình thị giác khác đã xem cùng ảnh — "
    "hãy coi nó là gợi ý mạnh, không phải metadata văn bản.\n"
    "Phân biệt visible / inferred / unknown. "
    "Dinh dưỡng là ƯỚC TÍNH cho phần nhìn thấy. Không chẩn đoán y khoa.\n"
    "TÊN MÓN: nếu là món Việt, BẮT BUỘC dùng tên tiếng Việt có dấu "
    "(cơm tấm, phở, bún bò Huế, bún riêu, gỏi cuốn, bánh mì, chả giò, ...). "
    "TUYỆT ĐỐI không dịch sang tiếng Anh kiểu 'Vietnamese Pork Chops with Fried Rice' — "
    "nếu thấy cơm + sườn nướng + bì + chả thì gọi đúng là 'cơm tấm'. "
    "Cơm tấm KHÔNG phải fried rice; phở KHÔNG phải 'Vietnamese noodle soup'; bún KHÔNG phải 'rice noodles'.\n"
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

    # Most analysis fields live under `vision_detail` in the pipeline result,
    # but `dish_name`/`confidence` live at top level. Read both.
    vd = analysis.get("vision_detail") if isinstance(analysis.get("vision_detail"), dict) else {}

    def _get(key):
        if analysis.get(key) not in (None, "", []):
            return analysis[key]
        if vd.get(key) not in (None, "", []):
            return vd.get(key)
        return None

    summary = {}
    for key in ("dish_name", "description", "category", "visual_form",
                "portion_description", "confidence"):
        value = _get(key)
        if value is not None:
            summary[key] = value

    ingredients = _get("ingredients") or []
    if isinstance(ingredients, list) and ingredients:
        summary["ingredients"] = ingredients[:12]

    instructions = _get("instructions")
    if isinstance(instructions, str) and instructions.strip():
        summary["instructions"] = instructions[:1500]

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

    uncertainty = _get("uncertainty") or {}
    if isinstance(uncertainty, dict) and uncertainty.get("level"):
        summary["uncertainty"] = uncertainty.get("level")

    possible = _get("possible_dishes") or []
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
        "QUY TẮC NGÔN NGỮ (BẮT BUỘC):\n"
        "1. Toàn bộ câu trả lời PHẢI bằng tiếng Việt.\n"
        "2. KHÔNG được dùng bất kỳ ký tự CJK nào (Trung 中文, Nhật ひらがな/カタカナ/漢字, Hàn 한글). "
        "Nếu trong câu trả lời xuất hiện ký tự CJK, đó là LỖI.\n"
        "3. Tên món gốc nếu có (Anh/Pháp/Nhật/Italy) → giữ nguyên chữ Latin, "
        "phần giải thích/mô tả/đo lường viết bằng tiếng Việt.\n"
        "4. KHÔNG dùng pinyin (zhānɡ, cài, v.v.) hoặc romaji.\n\n"
        "QUY TẮC DỮ LIỆU:\n"
        "- Trả lời CHỈ dựa trên `Phân tích` bên dưới. Không bịa số/bước nấu/thành phần ngoài dữ liệu.\n"
        "- Khi user hỏi cách nấu/recipe/instructions → dùng trường `instructions` (đã có nguyên bản tiếng Anh, dịch ý sang tiếng Việt khi giải thích).\n"
        "- Khi user hỏi nguyên liệu → dùng trường `ingredients`.\n"
        "- Khi nutrition thiếu → nói rõ \"chưa đủ dữ liệu khẩu phần\" và hỏi lại.\n\n"
        f"User hỏi: {user_q}\n"
        f"Phân tích: {summary_json}\n"
        "Trả lời (tiếng Việt thuần, không CJK):"
    )
