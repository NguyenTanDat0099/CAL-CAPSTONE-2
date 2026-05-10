#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// =============================================================================
//  Bulk-upload images from a local folder to Cloudinary, with:
//   - resume (skip files already in manifest)
//   - bounded concurrency
//   - progress + ETA
//   - manifest.json output (file path → Cloudinary URL + publicId + bytes)
//   - failed.json for errors
//
// Usage:
//   node scripts/bulk_upload_to_cloudinary.js \
//       --src "<absolute folder path>" \
//       [--folder calai/food-images]   \
//       [--concurrency 6]              \
//       [--limit 100]                  \
//       [--manifest path/to/manifest.json] \
//       [--dry-run]
//
// Reads CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET) from
// backend/.env via dotenv.
// =============================================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

// ---- Args -------------------------------------------------------------------

const args = process.argv.slice(2);
const opts = {
  src: null,
  folder: 'calai/food-images',
  concurrency: 6,
  limit: Infinity,
  manifest: null,
  failed: null,
  dryRun: false,
  retries: 3,
};

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  switch (a) {
    case '--src': opts.src = args[++i]; break;
    case '--folder': opts.folder = args[++i]; break;
    case '--concurrency': opts.concurrency = Number(args[++i]) || 6; break;
    case '--limit': opts.limit = Number(args[++i]) || Infinity; break;
    case '--manifest': opts.manifest = args[++i]; break;
    case '--failed': opts.failed = args[++i]; break;
    case '--dry-run': opts.dryRun = true; break;
    case '--retries': opts.retries = Number(args[++i]) || 3; break;
    case '-h':
    case '--help':
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 22).join('\n'));
      process.exit(0);
    default:
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
  }
}

if (!opts.src) {
  console.error('Missing --src <folder>');
  process.exit(2);
}
opts.src = path.resolve(opts.src);
if (!fs.existsSync(opts.src) || !fs.statSync(opts.src).isDirectory()) {
  console.error(`--src is not a directory: ${opts.src}`);
  process.exit(2);
}

const reportsDir = path.join(__dirname, '..', '.cloudinary-reports');
fs.mkdirSync(reportsDir, { recursive: true });
const stamp = path.basename(opts.src).replace(/[^a-z0-9]+/gi, '_').toLowerCase();
opts.manifest = opts.manifest || path.join(reportsDir, `manifest_${stamp}.json`);
opts.failed = opts.failed || path.join(reportsDir, `failed_${stamp}.json`);

// ---- Cloudinary config ------------------------------------------------------

const hasCloudinaryUrl = Boolean((process.env.CLOUDINARY_URL || '').trim());
const hasIndividualVars = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
if (!hasCloudinaryUrl && !hasIndividualVars) {
  if (!opts.dryRun) {
    console.error('Cloudinary not configured. Set CLOUDINARY_URL in backend/.env');
    process.exit(2);
  } else {
    console.warn('[warn] Cloudinary not configured — dry-run only, will not upload.');
  }
} else if (hasCloudinaryUrl) {
  cloudinary.config({ secure: true });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// ---- File discovery ---------------------------------------------------------

const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff']);
const MAX_FILE_BYTES_FREE_TIER = 10 * 1024 * 1024; // 10 MB

function listFilesRecursive(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); }
    catch (e) { console.warn(`[warn] cannot read ${cur}: ${e.message}`); continue; }
    for (const ent of entries) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (SUPPORTED_EXTS.has(ext)) out.push(p);
      }
    }
  }
  return out.sort();
}

// ---- Manifest persistence ---------------------------------------------------

function loadManifest(file) {
  if (!fs.existsSync(file)) return { entries: [], byPath: new Map() };
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw.entries) ? raw.entries : [];
    const byPath = new Map(arr.map((e) => [e.path, e]));
    return { entries: arr, byPath };
  } catch (e) {
    console.warn(`[warn] manifest ${file} unreadable, starting fresh: ${e.message}`);
    return { entries: [], byPath: new Map() };
  }
}

let manifestEntries;
let manifestByPath;
let manifestDirty = false;
let lastFlushAt = 0;

function flushManifest(force = false) {
  const now = Date.now();
  if (!manifestDirty) return;
  if (!force && now - lastFlushAt < 2000) return;
  fs.writeFileSync(opts.manifest, JSON.stringify({
    src: opts.src,
    folder: opts.folder,
    updatedAt: new Date().toISOString(),
    entries: manifestEntries,
  }, null, 2));
  lastFlushAt = now;
  manifestDirty = false;
}

const failedEntries = [];
function flushFailed() {
  fs.writeFileSync(opts.failed, JSON.stringify(failedEntries, null, 2));
}

// ---- Upload with retry + backoff -------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function uploadOne(filePath, publicId) {
  let lastErr;
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: opts.folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: false,
        unique_filename: false,
        use_filename: false,
      });
      return result;
    } catch (err) {
      lastErr = err;
      const isRate = /rate|429|too many/i.test(err?.message || '');
      const isNet = /ECONN|ETIMEDOUT|EAI_AGAIN|fetch failed|socket/i.test(err?.message || '');
      const transient = isRate || isNet || /5\d{2}/.test(String(err?.http_code));
      if (attempt < opts.retries && transient) {
        const wait = Math.min(30000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 500);
        console.warn(`[retry] ${path.basename(filePath)} attempt ${attempt} → wait ${wait}ms (${err.message})`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ---- Main loop --------------------------------------------------------------

(async () => {
  console.log(`[scan] enumerating ${opts.src}…`);
  const all = listFilesRecursive(opts.src);
  console.log(`[scan] ${all.length} image files`);

  const m = loadManifest(opts.manifest);
  manifestEntries = m.entries;
  manifestByPath = m.byPath;
  console.log(`[manifest] ${manifestEntries.length} entries already recorded`);

  const todo = [];
  let oversized = 0;
  for (const p of all) {
    if (manifestByPath.has(p)) continue;
    let size;
    try { size = fs.statSync(p).size; } catch { continue; }
    if (size > MAX_FILE_BYTES_FREE_TIER) {
      oversized++;
      failedEntries.push({ path: p, error: `OVERSIZED (${size} bytes > 10 MB free-tier limit)` });
      continue;
    }
    todo.push({ path: p, size });
    if (todo.length >= opts.limit) break;
  }
  if (oversized) console.warn(`[warn] ${oversized} files skipped (>10 MB)`);
  console.log(`[plan] ${todo.length} files to upload`);
  const totalBytes = todo.reduce((s, x) => s + x.size, 0);
  console.log(`[plan] total ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);

  if (opts.dryRun) {
    console.log('[dry-run] not uploading. Stopping.');
    flushFailed();
    return;
  }

  if (todo.length === 0) {
    console.log('[done] nothing to upload.');
    flushFailed();
    return;
  }

  // Bounded concurrency: simple worker pool
  let cursor = 0;
  let uploaded = 0;
  let failedCount = 0;
  let bytesDone = 0;
  const startedAt = Date.now();

  const printProgress = () => {
    const total = todo.length;
    const pct = ((uploaded + failedCount) / total) * 100;
    const elapsed = (Date.now() - startedAt) / 1000;
    const rate = (uploaded + failedCount) / elapsed;
    const remaining = total - (uploaded + failedCount);
    const etaSec = rate > 0 ? remaining / rate : 0;
    const etaStr = etaSec > 60 ? `${(etaSec / 60).toFixed(1)} min` : `${etaSec.toFixed(0)} s`;
    process.stdout.write(
      `\r[progress] ${uploaded + failedCount}/${total} (${pct.toFixed(1)}%)  ` +
      `ok=${uploaded} fail=${failedCount}  ${(bytesDone / 1024 / 1024).toFixed(1)} MB  ` +
      `${rate.toFixed(1)}/s  eta ${etaStr}  `
    );
  };

  async function worker(id) {
    while (true) {
      const idx = cursor++;
      if (idx >= todo.length) return;
      const item = todo[idx];
      const base = path.basename(item.path, path.extname(item.path));
      // Cloudinary public_id rules: avoid weird chars; collapse spaces/punct.
      const publicId = base.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 90);
      try {
        const result = await uploadOne(item.path, publicId);
        const entry = {
          path: item.path,
          file: path.basename(item.path),
          publicId: result.public_id,
          url: result.secure_url || result.url,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          format: result.format,
          uploadedAt: new Date().toISOString(),
        };
        manifestEntries.push(entry);
        manifestByPath.set(item.path, entry);
        manifestDirty = true;
        uploaded++;
        bytesDone += item.size;
      } catch (err) {
        failedCount++;
        const msg = err?.message || String(err);
        failedEntries.push({ path: item.path, error: msg });
        // Persist failures regularly so we don't lose them on crash.
        if (failedCount % 10 === 1) flushFailed();
      }
      flushManifest(false);
      if ((uploaded + failedCount) % 5 === 0) printProgress();
    }
  }

  const workers = Array.from({ length: opts.concurrency }, (_, i) => worker(i));

  const onExit = () => { flushManifest(true); flushFailed(); };
  process.on('SIGINT', () => { console.log('\n[abort] flushing manifest…'); onExit(); process.exit(130); });
  process.on('uncaughtException', (e) => { console.error('\n[fatal]', e); onExit(); process.exit(1); });

  await Promise.all(workers);
  printProgress();
  flushManifest(true);
  flushFailed();

  const elapsed = (Date.now() - startedAt) / 1000;
  console.log(`\n[done] uploaded=${uploaded} failed=${failedCount} in ${(elapsed / 60).toFixed(1)} min`);
  console.log(`[done] manifest: ${opts.manifest}`);
  if (failedCount > 0) console.log(`[done] failed log: ${opts.failed}`);
})();
