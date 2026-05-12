#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// =============================================================================
//  Map Cloudinary manifest → MySQL column.
//  Default target: foods.image_path  (admin food catalog)
//
// Usage:
//   node scripts/link_manifest_to_db.js --dry-run                    # preview
//   node scripts/link_manifest_to_db.js --commit                     # actually update
//   node scripts/link_manifest_to_db.js --table foods --column image_path --dry-run
//   node scripts/link_manifest_to_db.js --manifest /path/to/manifest.json --dry-run
//
// Behaviour:
//   - Loads manifest produced by bulk_upload_to_cloudinary.js
//   - Builds lookup keys: full local path, basename, basename-without-ext, slug
//   - For each row in <table>, normalises <column> and looks up a Cloudinary URL
//   - Skips rows that already hold http(s) URLs (assumed already migrated)
//   - In dry-run mode: just prints proposed changes (head 30) + counters
//   - In commit mode: wraps all UPDATEs in a transaction; writes a CSV side-log
// =============================================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// ---- Args -------------------------------------------------------------------

const args = process.argv.slice(2);
const opts = {
  table: 'foods',
  column: 'image_path',
  pkColumn: null,                 // auto-detected from PRIMARY KEY if null
  manifest: path.join(__dirname, '..', '.cloudinary-reports', 'manifest_food_images.json'),
  dryRun: true,                   // safe default
  limit: Infinity,                // limit rows updated (testing)
  showRows: 30,                   // dry-run preview rows
};

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  switch (a) {
    case '--table': opts.table = args[++i]; break;
    case '--column': opts.column = args[++i]; break;
    case '--pk': opts.pkColumn = args[++i]; break;
    case '--manifest': opts.manifest = args[++i]; break;
    case '--dry-run': opts.dryRun = true; break;
    case '--commit': opts.dryRun = false; break;
    case '--limit': opts.limit = Number(args[++i]) || Infinity; break;
    case '--show-rows': opts.showRows = Number(args[++i]) || 30; break;
    case '-h': case '--help':
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 28).join('\n'));
      process.exit(0);
    default:
      console.error(`Unknown arg: ${a}`); process.exit(2);
  }
}

if (!fs.existsSync(opts.manifest)) {
  console.error(`Manifest not found: ${opts.manifest}`);
  process.exit(2);
}

// ---- Load manifest ----------------------------------------------------------

const raw = JSON.parse(fs.readFileSync(opts.manifest, 'utf8'));
const entries = Array.isArray(raw) ? raw : Array.isArray(raw.entries) ? raw.entries : [];
console.log(`[manifest] ${entries.length} entries from ${opts.manifest}`);
if (entries.length === 0) { console.error('Empty manifest.'); process.exit(2); }

// Build lookup. Key forms tried in order: full path → basename → basename-no-ext → slug.
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const lookup = new Map();
const addKey = (k, url) => {
  if (!k) return;
  if (!lookup.has(k)) lookup.set(k, url);
};
for (const e of entries) {
  if (!e.url) continue;
  if (e.path) {
    addKey(e.path, e.url);
    addKey(e.path.replace(/\\/g, '/'), e.url);    // posix variant
    addKey(e.path.toLowerCase(), e.url);
    addKey(e.path.replace(/\\/g, '/').toLowerCase(), e.url);
  }
  if (e.file) {
    addKey(e.file, e.url);
    addKey(e.file.toLowerCase(), e.url);
    const noExt = e.file.replace(/\.[^.]+$/, '');
    addKey(noExt, e.url);
    addKey(noExt.toLowerCase(), e.url);
    addKey(slugify(noExt), e.url);
  }
}
console.log(`[lookup] ${lookup.size} keys built (including aliases)`);

// ---- DB connect -------------------------------------------------------------

const conn = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'calai',
  waitForConnections: true,
  connectionLimit: 4,
});

const tryLookup = (rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return null;          // already http URL → skip
  if (/^data:image\//i.test(value)) return null;         // base64 data URL → skip (not from this folder)
  // Try several normalisations
  const candidates = [
    value,
    value.toLowerCase(),
    value.replace(/\\/g, '/'),
    value.replace(/\\/g, '/').toLowerCase(),
    path.basename(value),
    path.basename(value).toLowerCase(),
    path.basename(value).replace(/\.[^.]+$/, ''),
    path.basename(value).replace(/\.[^.]+$/, '').toLowerCase(),
    slugify(path.basename(value).replace(/\.[^.]+$/, '')),
  ];
  for (const c of candidates) {
    const hit = lookup.get(c);
    if (hit) return hit;
  }
  return null;
};

// ---- Detect primary key -----------------------------------------------------

async function detectPrimaryKey() {
  if (opts.pkColumn) return opts.pkColumn;
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'
      ORDER BY ORDINAL_POSITION`,
    [process.env.DB_NAME || 'calai', opts.table]
  );
  if (!rows.length) throw new Error(`Cannot find PK for ${opts.table}; pass --pk <col>`);
  if (rows.length > 1) console.warn(`[warn] composite PK; using first column ${rows[0].COLUMN_NAME}`);
  return rows[0].COLUMN_NAME;
}

// ---- Main -------------------------------------------------------------------

(async () => {
  const pk = await detectPrimaryKey();
  console.log(`[plan] target: ${opts.table}.${opts.column}  (pk=${pk})`);
  console.log(`[plan] mode: ${opts.dryRun ? 'DRY-RUN' : 'COMMIT'}`);

  const [rows] = await conn.query(
    `SELECT \`${pk}\` AS pk, \`${opts.column}\` AS val
       FROM \`${opts.table}\`
      WHERE \`${opts.column}\` IS NOT NULL AND \`${opts.column}\` <> ''`
  );
  console.log(`[scan] ${rows.length} rows have a non-empty ${opts.column}`);

  let alreadyHttp = 0, matched = 0, unmatched = 0;
  const updates = [];   // { pk, oldVal, newUrl }
  const noMatch = [];

  for (const r of rows) {
    const oldVal = r.val;
    if (/^https?:\/\//i.test(String(oldVal))) { alreadyHttp++; continue; }
    const newUrl = tryLookup(oldVal);
    if (newUrl) {
      matched++;
      updates.push({ pk: r.pk, oldVal, newUrl });
      if (updates.length >= opts.limit) break;
    } else {
      unmatched++;
      if (noMatch.length < opts.showRows) noMatch.push({ pk: r.pk, val: oldVal });
    }
  }

  console.log('');
  console.log(`[summary] alreadyHttp = ${alreadyHttp}  (skipped — already URL)`);
  console.log(`[summary] matched     = ${matched}`);
  console.log(`[summary] unmatched   = ${unmatched}`);
  console.log('');

  if (updates.length > 0) {
    console.log(`[preview] first ${Math.min(opts.showRows, updates.length)} updates:`);
    for (const u of updates.slice(0, opts.showRows)) {
      const oldShort = String(u.oldVal).length > 70 ? String(u.oldVal).slice(0, 67) + '…' : String(u.oldVal);
      console.log(`  ${pk}=${u.pk}  ${oldShort}\n         → ${u.newUrl}`);
    }
  }
  if (noMatch.length > 0) {
    console.log(`\n[unmatched preview] first ${noMatch.length}:`);
    for (const n of noMatch) {
      console.log(`  ${pk}=${n.pk}  val=${String(n.val).slice(0, 90)}`);
    }
  }

  if (opts.dryRun) {
    console.log('\n[dry-run] no changes written. Re-run with --commit to apply.');
    await conn.end();
    return;
  }

  if (updates.length === 0) {
    console.log('\n[commit] nothing to update.');
    await conn.end();
    return;
  }

  // Side-log for rollback support
  const reportsDir = path.join(__dirname, '..', '.cloudinary-reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const sidelog = path.join(reportsDir, `db_update_${opts.table}_${opts.column}_${Date.now()}.csv`);
  const csv = ['pk,old_value,new_value'].concat(updates.map(u =>
    [u.pk, JSON.stringify(u.oldVal), JSON.stringify(u.newUrl)].join(',')
  )).join('\n');
  fs.writeFileSync(sidelog, csv);
  console.log(`[sidelog] ${sidelog}`);

  // Apply in a transaction
  const c = await conn.getConnection();
  try {
    await c.beginTransaction();
    let done = 0;
    const stmt = `UPDATE \`${opts.table}\` SET \`${opts.column}\` = ? WHERE \`${pk}\` = ?`;
    for (const u of updates) {
      await c.query(stmt, [u.newUrl, u.pk]);
      done++;
      if (done % 200 === 0) process.stdout.write(`\r[commit] ${done}/${updates.length}`);
    }
    await c.commit();
    process.stdout.write(`\r[commit] ${done}/${updates.length} ✓\n`);
  } catch (err) {
    await c.rollback();
    console.error('[commit] rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    c.release();
    await conn.end();
  }
})().catch((e) => { console.error(e); process.exit(1); });
