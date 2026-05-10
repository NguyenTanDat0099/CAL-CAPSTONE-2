#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// =============================================================================
//  Seed foods.image_path from Cloudinary manifest by matching food_name → filename.
//  Only updates rows whose food_name has a UNIQUE filename match in the manifest.
//  Leaves ambiguous and unmatched rows untouched.
//
// Usage:
//   node scripts/seed_foods_image_from_manifest.js --dry-run
//   node scripts/seed_foods_image_from_manifest.js --commit
//   node scripts/seed_foods_image_from_manifest.js --include-ambiguous --commit  # picks first candidate
//   node scripts/seed_foods_image_from_manifest.js --overwrite --commit          # also replaces existing image_path
// =============================================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const args = process.argv.slice(2);
const opts = {
  manifest: path.join(__dirname, '..', '.cloudinary-reports', 'manifest_food_images.json'),
  dryRun: true,
  includeAmbiguous: false,
  overwrite: false,
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  switch (a) {
    case '--manifest': opts.manifest = args[++i]; break;
    case '--dry-run': opts.dryRun = true; break;
    case '--commit': opts.dryRun = false; break;
    case '--include-ambiguous': opts.includeAmbiguous = true; break;
    case '--overwrite': opts.overwrite = true; break;
    case '-h': case '--help':
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 16).join('\n'));
      process.exit(0);
    default: console.error(`Unknown arg: ${a}`); process.exit(2);
  }
}

const slugify = (s) => String(s).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ---- Load manifest, build prefix index --------------------------------------

const raw = JSON.parse(fs.readFileSync(opts.manifest, 'utf8'));
const entries = (raw.entries || raw).filter((e) => e && e.url && e.file);
console.log(`[manifest] ${entries.length} entries from ${opts.manifest}`);

// Index by clean slug (filename basename, with trailing -<digits> stripped).
// e.g. "tofu-stir-fry-351409.jpg" → slug "tofu-stir-fry".
const byCleanSlug = new Map();
for (const e of entries) {
  const noExt = e.file.replace(/\.[^.]+$/, '');
  const cleanSlug = slugify(noExt.replace(/-?\d{4,}$/, ''));
  if (!cleanSlug) continue;
  if (!byCleanSlug.has(cleanSlug)) byCleanSlug.set(cleanSlug, []);
  byCleanSlug.get(cleanSlug).push(e);
}
console.log(`[index] ${byCleanSlug.size} unique food slugs in manifest`);

// ---- Find matches per food --------------------------------------------------

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
  console.log(`[scan] ${foods.length} foods\n`);

  const matchOne = (foodSlug) => {
    let exact = byCleanSlug.get(foodSlug);
    if (exact && exact.length) return exact;
    const partial = [];
    for (const [k, v] of byCleanSlug) {
      if (k === foodSlug || k.startsWith(foodSlug + '-')) partial.push(...v);
    }
    return partial;
  };

  const updates = [];
  const stats = { unique: 0, ambiguous: 0, none: 0, alreadySet: 0 };

  for (const f of foods) {
    const hasExisting = f.image_path && String(f.image_path).trim().length > 0;
    if (hasExisting && !opts.overwrite) {
      stats.alreadySet++;
      continue;
    }
    const slug = slugify(f.food_name);
    const candidates = matchOne(slug);
    if (candidates.length === 0) { stats.none++; continue; }
    if (candidates.length === 1) {
      stats.unique++;
      updates.push({ food_id: f.food_id, food_name: f.food_name, file: candidates[0].file, url: candidates[0].url, mode: 'unique' });
    } else {
      stats.ambiguous++;
      if (opts.includeAmbiguous) {
        const pick = candidates[0];
        updates.push({ food_id: f.food_id, food_name: f.food_name, file: pick.file, url: pick.url, mode: `ambiguous(${candidates.length})` });
      }
    }
  }

  console.log(`[stats] alreadySet=${stats.alreadySet}  unique=${stats.unique}  ambiguous=${stats.ambiguous}  none=${stats.none}`);
  console.log(`[plan]  ${updates.length} updates (${opts.includeAmbiguous ? 'incl. ambiguous' : 'unique only'})\n`);

  if (updates.length === 0) {
    console.log('[done] nothing to update.');
    await conn.end();
    return;
  }

  for (const u of updates) {
    console.log(`  food_id=${String(u.food_id).padStart(3)}  ${u.food_name.padEnd(28)} [${u.mode}]`);
    console.log(`     file: ${u.file}`);
    console.log(`     url : ${u.url}`);
  }

  if (opts.dryRun) {
    console.log('\n[dry-run] no changes written. Re-run with --commit to apply.');
    await conn.end();
    return;
  }

  // Side log
  const reportsDir = path.join(__dirname, '..', '.cloudinary-reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const sidelog = path.join(reportsDir, `seed_foods_${Date.now()}.csv`);
  fs.writeFileSync(
    sidelog,
    ['food_id,food_name,file,url'].concat(
      updates.map(u => [u.food_id, JSON.stringify(u.food_name), JSON.stringify(u.file), JSON.stringify(u.url)].join(','))
    ).join('\n')
  );
  console.log(`\n[sidelog] ${sidelog}`);

  const c = await conn.getConnection();
  try {
    await c.beginTransaction();
    for (const u of updates) {
      await c.query('UPDATE foods SET image_path = ? WHERE food_id = ?', [u.url, u.food_id]);
    }
    await c.commit();
    console.log(`[commit] ${updates.length} rows updated.`);
  } catch (err) {
    await c.rollback();
    console.error('[commit] rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    c.release();
    await conn.end();
  }
})().catch((e) => { console.error(e); process.exit(1); });
