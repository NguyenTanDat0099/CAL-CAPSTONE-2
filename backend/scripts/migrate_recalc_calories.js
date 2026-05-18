#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// Migration: tính lại foods.calories bằng công thức Atwater khi giá trị
// hiện tại lệch quá ngưỡng so với macros.
//
//   expected = 4*protein + 4*carbs + 9*fat
//   UPDATE nếu |calories - expected| > THRESHOLD_PCT × expected
//
// Usage (từ backend/):
//   node scripts/migrate_recalc_calories.js --dry-run
//   node scripts/migrate_recalc_calories.js --commit
//   node scripts/migrate_recalc_calories.js --commit --threshold 0.5

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const args = process.argv.slice(2);
const opts = { dryRun: true, thresholdPct: 0.3 };
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === '--commit') opts.dryRun = false;
  else if (a === '--dry-run') opts.dryRun = true;
  else if (a === '--threshold') opts.thresholdPct = Number(args[++i] || 0.3);
  else if (a === '-h' || a === '--help') {
    console.log('Usage: migrate_recalc_calories.js [--dry-run|--commit] [--threshold 0.3]');
    process.exit(0);
  } else { console.error('Unknown arg:', a); process.exit(2); }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log(opts.dryRun ? '🔍 DRY RUN' : '⚙️  COMMIT mode');
  console.log(`Threshold: ${(opts.thresholdPct * 100).toFixed(0)}% lệch so với Atwater\n`);

  const [rows] = await conn.query(`
    SELECT food_id, food_name, calories, protein, carbs, fat
    FROM foods
    ORDER BY food_id
  `);

  let analysed = 0;
  let toUpdate = 0;
  let skippedNoMacros = 0;
  let skippedWithinThreshold = 0;
  const samples = [];

  for (const r of rows) {
    analysed += 1;
    const cal = Number(r.calories ?? 0);
    const p = Number(r.protein ?? 0);
    const c = Number(r.carbs ?? 0);
    const f = Number(r.fat ?? 0);
    const expected = 4 * p + 4 * c + 9 * f;

    if (expected <= 0) { skippedNoMacros += 1; continue; }

    const diff = Math.abs(cal - expected);
    const pct = diff / expected;
    if (pct <= opts.thresholdPct) { skippedWithinThreshold += 1; continue; }

    toUpdate += 1;
    const newCal = Math.round(expected);

    if (samples.length < 20) {
      samples.push({
        id: r.food_id,
        name: (r.food_name || '').slice(0, 38),
        old: cal,
        new: newCal,
        pct: (pct * 100).toFixed(0),
        p, c, f,
      });
    }

    if (!opts.dryRun) {
      await conn.query('UPDATE foods SET calories = ? WHERE food_id = ?', [newCal, r.food_id]);
    }
  }

  console.log(`📊 Tổng                       : ${analysed} món`);
  console.log(`   skip (không có macros)     : ${skippedNoMacros}`);
  console.log(`   skip (đã trong ngưỡng OK)  : ${skippedWithinThreshold}`);
  console.log(`   ${opts.dryRun ? 'WOULD update' : 'updated'}            : ${toUpdate}`);

  if (samples.length) {
    console.log(`\nSample (top ${samples.length}):`);
    console.log(`   id     món                                       old → new      (lệch %)`);
    for (const s of samples) {
      const arrow = `${String(s.old).padStart(5)} → ${String(s.new).padEnd(5)}`;
      console.log(`   [${String(s.id).padStart(5)}] "${s.name.padEnd(38)}"  ${arrow}  (${s.pct.padStart(3)}%)  P${s.p} C${s.c} F${s.f}`);
    }
  }

  await conn.end();
  console.log(opts.dryRun ? '\n✅ DRY RUN xong. Chạy lại với --commit để áp dụng.' : '\n✅ Đã commit.');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
