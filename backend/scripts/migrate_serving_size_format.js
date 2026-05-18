#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// One-off migration: chuẩn hoá foods.serving_size về format "1 phần (Xg)".
//
// Trước migration: các row import từ Food-100k có serving_size dạng
//   "coffee mix:20g"                       (1 ingredient)
//   "abalone:200g, sauce:50g"              (nhiều ingredient, tính tổng)
//   "beef:150g, vegetables:100g"           (tổng = 250g)
// Phần "<tên ingredient>:" là rò rỉ từ dataset gốc, không nên xuất hiện cho
// user.
//
// Sau migration: serving_size = "1 phần (Xg)" với X = tổng số gram từ tất
// cả ingredient. Các row đã sạch (vd "1 bowl", "30g", "2 eggs") được giữ
// nguyên.
//
// Usage (từ backend/):
//   node scripts/migrate_serving_size_format.js --dry-run
//   node scripts/migrate_serving_size_format.js --commit

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');
const { formatServing, isBeverage } = require('./_servingSize');

const args = process.argv.slice(2);
const opts = { dryRun: true };
for (const arg of args) {
  if (arg === '--commit') opts.dryRun = false;
  else if (arg === '--dry-run') opts.dryRun = true;
  else if (arg === '-h' || arg === '--help') {
    console.log(`Usage: ${process.argv[1]} [--dry-run|--commit]`);
    process.exit(0);
  } else {
    console.error('Unknown arg:', arg);
    process.exit(2);
  }
}

// "<chữ>:<số>" - kiểu rò rỉ từ Food-100K (vd "coffee mix:20g").
const DIRTY_INGREDIENT_PATTERN = /[a-zA-ZÀ-ỹ][a-zA-ZÀ-ỹ\s]*:\s*\d/;

// "<số> người" / "<số> nguoi" - dataset Cooky/MNMN dùng "khẩu phần"
// dưới dạng số người ăn. Cần đổi thành "1 phần" để khớp UI portion dropdown.
const PEOPLE_PORTION_PATTERN = /^\s*\d+\s*(?:ng[uư][òờ]i|nguoi)\b/i;

const normalizeServing = (raw, foodName) => {
  if (!raw) return { changed: false, value: raw };
  const text = String(raw).trim();
  if (!text) return { changed: false, value: text };

  // Đã đúng format "1 phần (Xg)" / "1 ly (Xml)" / "1 phần" thì giữ nguyên.
  if (/^1?\s*(?:ph[ầa]n|ly)(\s|$|[(·])/i.test(text)) return { changed: false, value: text };

  // Trường hợp "X người" → ép thành "1 phần" (hoặc "1 ly" nếu là đồ uống).
  if (PEOPLE_PORTION_PATTERN.test(text)) {
    return {
      changed: true,
      value: isBeverage(foodName) ? '1 ly' : '1 phần',
    };
  }

  if (!DIRTY_INGREDIENT_PATTERN.test(text)) {
    // Sạch rồi: "30g", "1 bowl", "1 plate", "2 eggs", "1 medium apple"...
    return { changed: false, value: text };
  }

  const formatted = formatServing(foodName, text);
  if (formatted) {
    return { changed: true, value: formatted };
  }
  // Có dạng "x:y" nhưng không trích được gram/ml → fallback chuỗi sạch
  // dựa trên tên (đồ uống → "1 ly", còn lại → "1 phần").
  const fallback = isBeverage(foodName) ? '1 ly' : '1 phần';
  return { changed: true, value: fallback };
};

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log(opts.dryRun ? '🔍 DRY RUN' : '⚙️  COMMIT mode');

  const [rows] = await conn.query(`
    SELECT food_id, food_name, serving_size FROM foods ORDER BY food_id
  `);

  let dirty = 0;
  let clean = 0;
  let empty = 0;
  const samples = [];
  const fallbackSamples = [];

  for (const row of rows) {
    if (!row.serving_size) { empty += 1; continue; }
    const result = normalizeServing(row.serving_size, row.food_name);
    if (!result.changed) { clean += 1; continue; }
    dirty += 1;

    const targetBucket = (result.value === '1 phần' || result.value === '1 ly') ? fallbackSamples : samples;
    if (targetBucket.length < 25) {
      targetBucket.push(
        `  ${String(row.food_id).padEnd(6)} "${(row.food_name || '').slice(0, 35).padEnd(35)}" :: ${String(row.serving_size).slice(0, 50).padEnd(50)} -> ${result.value}`
      );
    }

    if (!opts.dryRun) {
      await conn.query(
        'UPDATE foods SET serving_size = ? WHERE food_id = ?',
        [result.value, row.food_id]
      );
    }
  }

  console.log(`\n📊 ${rows.length} foods scanned`);
  console.log(`   empty serving_size: ${empty}`);
  console.log(`   already clean:      ${clean}`);
  console.log(`   to update:          ${dirty}`);
  if (samples.length) {
    console.log('\n   sample moves (with grams):');
    for (const line of samples) console.log(line);
  }
  if (fallbackSamples.length) {
    console.log('\n   sample moves (no grams found → "1 phần"):');
    for (const line of fallbackSamples) console.log(line);
  }

  await conn.end();
  console.log(opts.dryRun ? '\n✅ DRY RUN complete. Re-run with --commit to apply.' : '\n✅ Migration complete.');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
