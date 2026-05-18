#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// One-off migration: chuẩn hoá category_name của toàn bộ foods về một trong
// 5 meal slot mà UI user dùng làm filter (Breakfast/Lunch/Dinner/Snack/Other).
//
// Trước migration: foodcategories có thể chứa "Packaged Food", "Restaurant
// Food", "Raw Vegetables and Fruits", v.v. — User filter `Breakfast/Lunch/...`
// không match được nên mọi món rớt vào tab "Other".
//
// Sau migration: mọi food.category_id trỏ đến 1 trong 5 category chuẩn.
// Heuristic mapping ưu tiên tên món, fallback theo category_name cũ.
//
// Usage (từ backend/):
//   node scripts/migrate_food_categories_to_meal_slots.js --dry-run
//   node scripts/migrate_food_categories_to_meal_slots.js --commit
//   node scripts/migrate_food_categories_to_meal_slots.js --commit --prune

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');
const { normalizeMealSlot, MEAL_SLOTS } = require('./_foodCategory');

const args = process.argv.slice(2);
const opts = {
  dryRun: true,
  prune: false,
};
for (const arg of args) {
  if (arg === '--commit') opts.dryRun = false;
  else if (arg === '--dry-run') opts.dryRun = true;
  else if (arg === '--prune') opts.prune = true;
  else if (arg === '-h' || arg === '--help') {
    console.log(`Usage: ${process.argv[1]} [--dry-run|--commit] [--prune]`);
    process.exit(0);
  } else {
    console.error('Unknown arg:', arg);
    process.exit(2);
  }
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

  // 1) Đảm bảo 5 category chuẩn tồn tại + lấy id.
  const slotIds = {};
  for (const slot of MEAL_SLOTS) {
    const [rows] = await conn.query(
      'SELECT category_id FROM foodcategories WHERE LOWER(category_name) = LOWER(?) LIMIT 1',
      [slot]
    );
    if (rows[0]) {
      slotIds[slot] = rows[0].category_id;
    } else if (opts.dryRun) {
      slotIds[slot] = `<new ${slot}>`;
      console.log(`  + would CREATE category: ${slot}`);
    } else {
      const [inserted] = await conn.query(
        'INSERT INTO foodcategories (category_name) VALUES (?)',
        [slot]
      );
      slotIds[slot] = inserted.insertId;
      console.log(`  + created category: ${slot} (id=${inserted.insertId})`);
    }
  }

  // 2) Liệt kê foods + category_name hiện tại + tính meal slot mục tiêu.
  const [foods] = await conn.query(`
    SELECT f.food_id, f.food_name, f.category_id, fc.category_name
    FROM foods f
    LEFT JOIN foodcategories fc ON fc.category_id = f.category_id
    ORDER BY f.food_id
  `);

  const summary = { unchanged: 0, updated: 0, perSlot: { Breakfast: 0, Lunch: 0, Dinner: 0, Snack: 0, Other: 0 } };
  const sampleMoves = [];

  for (const food of foods) {
    const targetSlot = normalizeMealSlot(food.category_name, food.food_name);
    summary.perSlot[targetSlot] = (summary.perSlot[targetSlot] || 0) + 1;

    const targetId = slotIds[targetSlot];
    if (food.category_id === targetId) {
      summary.unchanged += 1;
      continue;
    }

    summary.updated += 1;
    if (sampleMoves.length < 30) {
      sampleMoves.push(
        `  ${food.food_id.toString().padEnd(6)} "${(food.food_name || '').slice(0, 40).padEnd(40)}" :: ${String(food.category_name || '∅').padEnd(28)} -> ${targetSlot}`
      );
    }

    if (!opts.dryRun) {
      await conn.query(
        'UPDATE foods SET category_id = ? WHERE food_id = ?',
        [targetId, food.food_id]
      );
    }
  }

  console.log(`\n📊 ${foods.length} foods scanned`);
  console.log(`   unchanged: ${summary.unchanged}`);
  console.log(`   to update: ${summary.updated}`);
  console.log('   distribution:');
  for (const slot of MEAL_SLOTS) {
    console.log(`     ${slot.padEnd(10)} = ${summary.perSlot[slot]}`);
  }
  if (sampleMoves.length) {
    console.log('\n   sample moves:');
    for (const line of sampleMoves) console.log(line);
    if (summary.updated > sampleMoves.length) {
      console.log(`     ... và ${summary.updated - sampleMoves.length} dòng khác`);
    }
  }

  // 3) Tuỳ chọn: xoá các foodcategories không còn food nào trỏ về (legacy
  //    "Packaged Food", "Restaurant Food", v.v.).
  if (opts.prune) {
    const [orphans] = await conn.query(`
      SELECT fc.category_id, fc.category_name
      FROM foodcategories fc
      LEFT JOIN foods f ON f.category_id = fc.category_id
      WHERE f.food_id IS NULL
        AND fc.category_name NOT IN (?, ?, ?, ?, ?)
    `, MEAL_SLOTS);
    if (orphans.length === 0) {
      console.log('\n🧹 no orphan categories to prune');
    } else {
      console.log(`\n🧹 ${opts.dryRun ? 'would delete' : 'deleting'} ${orphans.length} orphan categories:`);
      for (const row of orphans) {
        console.log(`     - ${row.category_name} (id=${row.category_id})`);
        if (!opts.dryRun) {
          await conn.query('DELETE FROM foodcategories WHERE category_id = ?', [row.category_id]);
        }
      }
    }
  }

  await conn.end();
  console.log(opts.dryRun ? '\n✅ DRY RUN complete. Re-run with --commit to apply.' : '\n✅ Migration complete.');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
