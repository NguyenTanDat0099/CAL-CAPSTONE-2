'use strict';

// Shared helper for formatting foods.serving_size as either
//   "1 ly (Xml)" — đồ uống / lỏng
//   "1 phần (Xg)" — món ăn / rắn
// Dùng bởi import_food_datasets.js và migrate_serving_size_format.js để cả
// future imports lẫn data hiện tại đều thống nhất format.

const BEVERAGE_NAME_RE = /\b(milk|coffee|latte|cappuccino|espresso|mocha|tea|matcha|cocoa|chocolate\s*(?:milk|drink)|juice|smoothie|soda|cola|water|lemonade|beer|wine|cocktail|shake|protein shake|sữa|cà phê|trà|nước ép|sinh tố|trà sữa)\b/i;

// Parse a raw serving string (e.g. "milk:100ml" or "abalone:200g, sauce:50g")
// and return { total, unit } where unit is 'g' or 'ml'. Returns null if no
// numeric portion can be extracted. kg → g, l → ml. If both g and ml appear
// in the same string, prefer g and treat ml as g (rare edge case).
function parsePortion(raw) {
  const text = Array.isArray(raw) ? raw.join(', ') : String(raw || '');
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
  // Cả 2 đơn vị → đơn vị nào lớn hơn thắng (vd latte = coffee 18g + milk 200ml
  // → ml thắng → "1 ly").
  if (totalMl > totalG) return { total: totalMl + totalG, unit: 'ml' };
  return { total: totalG + totalMl, unit: 'g' };
}

// Decide if this food should be presented as a beverage ("1 ly") or solid
// ("1 phần"). Tin đơn vị trước, name chỉ là fallback khi không có đơn vị
// (vd "1 cup of coffee" không có g/ml).
function isBeverage(name, portion) {
  if (portion && portion.unit === 'ml') return true;
  if (portion && portion.unit === 'g') return false; // bột "coffee mix" 20g vẫn là phần
  if (BEVERAGE_NAME_RE.test(String(name || ''))) return true;
  return false;
}

// Build the final serving_size string. Returns null if nothing useful can
// be extracted (caller should fall back to raw value or leave NULL).
function formatServing(name, raw) {
  const portion = parsePortion(raw);
  if (!portion) return null;
  if (isBeverage(name, portion)) {
    return `1 ly (${Math.round(portion.total)}ml)`;
  }
  return `1 phần (${Math.round(portion.total)}g)`;
}

module.exports = { parsePortion, isBeverage, formatServing, BEVERAGE_NAME_RE };
