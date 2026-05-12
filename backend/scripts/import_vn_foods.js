#!/usr/bin/env node
'use strict';

// Import Vietnamese food dataset into the foods table.
//
// Usage:
//   node scripts/import_vn_foods.js --dry-run
//   node scripts/import_vn_foods.js --commit

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');

const CSV_PATH = path.join(__dirname, '..', 'data', 'dataFoodVietNam.csv');
const SERVING_SIZE = '100g';

const args = process.argv.slice(2);
const dryRun = !args.includes('--commit');

// Vietnamese decimal notation uses comma inside quoted fields, e.g. "8,6" = 8.6
function parseVnNumber(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === '0') return 0;
  const cleaned = raw.trim().replace(/[^0-9,.-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// Parse CSV manually to handle Vietnamese decimal commas inside quoted fields
function parseCsvLine(line) {
  const fields = [];
  let inQuote = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

async function loadCsv() {
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const rows = [];
  // skip header line
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i]);
    if (f.length < 17) continue;
    const name = f[0].trim();
    if (!name) continue;
    rows.push({
      name,
      calories: parseVnNumber(f[1]),
      protein:  parseVnNumber(f[2]),
      fat:      parseVnNumber(f[3]),
      carbs:    parseVnNumber(f[4]),
      fiber:    parseVnNumber(f[5]),
      sodium:   parseVnNumber(f[10]),
      category: f[16].trim(),
    });
  }
  return rows;
}

async function main() {
  const rows = await loadCsv();
  console.log(`Loaded ${rows.length} rows from ${path.basename(CSV_PATH)}`);

  if (dryRun) {
    console.log('\n[DRY RUN] First 5 rows:');
    rows.slice(0, 5).forEach(r => console.log(' ', JSON.stringify(r)));
    const categories = [...new Set(rows.map(r => r.category))];
    console.log(`\nCategories (${categories.length}):`);
    categories.forEach(c => console.log(' -', c));
    console.log('\nRun with --commit to insert into database.');
    return;
  }

  const pool = await mysql.createPool({
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT || 3306),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const categoryIdCache = {};

    async function getCategoryId(name) {
      if (categoryIdCache[name]) return categoryIdCache[name];
      const [rows] = await pool.query(
        'SELECT category_id FROM foodcategories WHERE category_name = ? LIMIT 1',
        [name]
      );
      if (rows.length) {
        categoryIdCache[name] = rows[0].category_id;
        return rows[0].category_id;
      }
      const [result] = await pool.query(
        'INSERT INTO foodcategories (category_name) VALUES (?)',
        [name]
      );
      categoryIdCache[name] = result.insertId;
      console.log(`  Created category: "${name}" (id=${result.insertId})`);
      return result.insertId;
    }

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      // Skip duplicates by name
      const [existing] = await pool.query(
        'SELECT food_id FROM foods WHERE food_name = ? LIMIT 1',
        [row.name]
      );
      if (existing.length) {
        skipped++;
        continue;
      }

      const categoryId = row.category ? await getCategoryId(row.category) : null;
      await pool.query(
        `INSERT INTO foods (food_name, category_id, calories, protein, carbs, fat, fiber, sodium, serving_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.name, categoryId, row.calories, row.protein, row.carbs, row.fat, row.fiber, row.sodium, SERVING_SIZE]
      );
      inserted++;
    }

    console.log(`\nDone: ${inserted} inserted, ${skipped} skipped (duplicates).`);
  } finally {
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
