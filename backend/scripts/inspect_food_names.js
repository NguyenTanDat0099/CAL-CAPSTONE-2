'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const slugify = (s) => String(s).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

(async () => {
  const conn = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'calai',
  });

  const [foods] = await conn.query(
    `SELECT food_id, food_name, image_path FROM foods ORDER BY food_id`
  );
  console.log(`Total foods: ${foods.length}\n`);

  const manifestPath = path.join(__dirname, '..', '.cloudinary-reports', 'manifest_food_images.json');
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = raw.entries || raw;

  // Map: prefix-slug → list of matching entries
  const byPrefix = new Map();
  for (const e of entries) {
    if (!e.file) continue;
    const noExt = e.file.replace(/\.[^.]+$/, '');
    const cleanSlug = slugify(noExt.replace(/-?\d{4,}$/, ''));
    if (!cleanSlug) continue;
    if (!byPrefix.has(cleanSlug)) byPrefix.set(cleanSlug, []);
    byPrefix.get(cleanSlug).push(e);
  }

  let matched = 0, ambiguous = 0, none = 0;
  for (const f of foods) {
    const slug = slugify(f.food_name);
    let hit = byPrefix.get(slug);
    // Try partial: food slug as prefix of filename slug
    if (!hit) {
      const partial = [];
      for (const [k, v] of byPrefix) {
        if (k.startsWith(slug + '-') || k === slug) partial.push(...v);
        if (partial.length >= 5) break;
      }
      hit = partial.length ? partial : null;
    }

    let tag;
    if (!hit) { none++; tag = '✗ no match'; }
    else if (hit.length === 1) { matched++; tag = `✓ unique → ${hit[0].file}`; }
    else { ambiguous++; tag = `~ ${hit.length} candidates → ${hit.slice(0, 3).map(e => e.file).join(', ')}…`; }
    console.log(`  ${String(f.food_id).padStart(3)}  ${String(f.food_name).padEnd(40)} | slug=${slug.padEnd(28)} | ${tag}`);
  }

  console.log(`\nSummary: unique=${matched}  ambiguous=${ambiguous}  none=${none}  (of ${foods.length})`);
  await conn.end();
})();
