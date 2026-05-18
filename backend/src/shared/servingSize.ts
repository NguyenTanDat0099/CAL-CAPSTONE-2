// Coerce mọi giá trị foods.serving_size về 1 format thống nhất ngay khi
// backend insert/update, để future imports không cần chạy migration tay.
// Phải khớp logic với:
//   backend/scripts/migrate_serving_size_format.js
//   backend/scripts/_servingSize.js

const BEVERAGE_NAME_RE = /\b(milk|coffee|latte|cappuccino|espresso|mocha|tea|matcha|cocoa|chocolate\s*(?:milk|drink)|juice|smoothie|soda|cola|water|lemonade|beer|wine|cocktail|shake|protein shake|sữa|cà phê|trà|nước ép|sinh tố|trà sữa)\b/i;

// "<chữ>:<số>" — kiểu rò rỉ từ dataset Food-100K (vd "coffee mix:20g").
const DIRTY_INGREDIENT_PATTERN = /[a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ\s]*:\s*\d/;

// "<số> người" — dataset Cooky/MNMN dùng số người ăn làm khẩu phần.
const PEOPLE_PORTION_PATTERN = /^\s*\d+\s*(?:ng[uư][òờ]i|nguoi)\b/i;

// Đã đúng format "1 phần (Xg)" / "1 ly (Xml)" / "1 phần" / "1 ly".
const ALREADY_NORMALIZED_PATTERN = /^1?\s*(?:ph[ầa]n|ly)(\s|$|[(·])/i;

interface PortionAmount {
  total: number;
  unit: 'g' | 'ml';
}

function parsePortion(raw: string | null | undefined): PortionAmount | null {
  const text = String(raw ?? '');
  if (!text) return null;
  const matches = [...text.matchAll(/(-?\d+(?:\.\d+)?)\s*(kg|g|ml|l|liter|litre|gram|grams)\b/gi)];
  if (matches.length === 0) return null;
  let totalG = 0;
  let totalMl = 0;
  for (const m of matches) {
    const v = Number(m[1]);
    const u = m[2].toLowerCase();
    if (!Number.isFinite(v)) continue;
    if (u === 'kg') totalG += v * 1000;
    else if (u === 'g' || u === 'gram' || u === 'grams') totalG += v;
    else if (u === 'l' || u === 'liter' || u === 'litre') totalMl += v * 1000;
    else if (u === 'ml') totalMl += v;
  }
  if (totalG === 0 && totalMl === 0) return null;
  if (totalMl > 0 && totalG === 0) return { total: totalMl, unit: 'ml' };
  if (totalG > 0 && totalMl === 0) return { total: totalG, unit: 'g' };
  if (totalMl > totalG) return { total: totalMl + totalG, unit: 'ml' };
  return { total: totalG + totalMl, unit: 'g' };
}

function isBeverage(foodName: string | null | undefined, portion: PortionAmount | null): boolean {
  if (portion && portion.unit === 'ml') return true;
  if (portion && portion.unit === 'g') return false;
  return BEVERAGE_NAME_RE.test(String(foodName ?? ''));
}

/**
 * Coerce 1 serving_size value về format chuẩn của hệ thống.
 * Trả về null nếu input null/empty — caller giữ NULL trong DB.
 *
 * Các trường hợp:
 *   "10 người"             → "1 phần" (hoặc "1 ly" nếu đồ uống)
 *   "coffee mix:20g"       → "1 phần (20g)"
 *   "milk:100ml"           → "1 ly (100ml)"
 *   "abalone:200g, ..."    → "1 phần (Xg)" (tổng grams)
 *   "1 bowl", "30g"        → giữ nguyên (đã sạch)
 *   "1 phần (200g)"        → giữ nguyên (đã chuẩn)
 */
export function normalizeServingSize(
  raw: string | null | undefined,
  foodName?: string | null
): string | null {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;

  if (ALREADY_NORMALIZED_PATTERN.test(text)) return text;

  if (PEOPLE_PORTION_PATTERN.test(text)) {
    return isBeverage(foodName, null) ? '1 ly' : '1 phần';
  }

  if (!DIRTY_INGREDIENT_PATTERN.test(text)) {
    // "30g", "1 bowl", "2 eggs", "1 medium apple",... giữ nguyên — admin gõ tay
    // hoặc dataset đã sạch.
    return text;
  }

  // Có dạng "<ingredient>:<số><đơn vị>" — parse và format lại.
  const portion = parsePortion(text);
  if (portion) {
    return isBeverage(foodName, portion)
      ? `1 ly (${Math.round(portion.total)}ml)`
      : `1 phần (${Math.round(portion.total)}g)`;
  }
  return isBeverage(foodName, null) ? '1 ly' : '1 phần';
}
