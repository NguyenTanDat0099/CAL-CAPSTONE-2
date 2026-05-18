#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// Import/preview food catalog rows from local datasets.
//
// Usage:
//   node scripts/import_food_datasets.js --dry-run
//   node scripts/import_food_datasets.js --dry-run --preview 100
//   node scripts/import_food_datasets.js --commit
//   node scripts/import_food_datasets.js --commit --limit 5000 --update-existing
//
// Dry-run does not require MySQL. Commit inserts into foodcategories + foods.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');

const repoRoot = path.resolve(__dirname, '..', '..');
const reportsDir = path.join(__dirname, '..', '.dataset-reports');

const args = process.argv.slice(2);
const opts = {
  dryRun: true,
  source: 'all',
  food100k: path.join(repoRoot, 'dataset of food-100k', 'MM-Food-100K.csv'),
  healthy: path.join(repoRoot, 'dataset of Healthy Eating', 'healthy_eating_dataset.csv'),
  limit: 0,
  preview: 60,
  minFoodProb: 0.8,
  maxCalories: 1200,
  maxPortionGrams: 900,
  requireImage: true,
  allowPlaceholderImages: false,
  updateExisting: false,
  overwrite: false,
};

const help = `
Import/preview food catalog rows from local datasets.

Options:
  --dry-run                     Preview only. This is the default.
  --commit                      Insert rows into MySQL foods table.
  --source all|food100k|healthy Source dataset. Default: all.
  --limit N                     Max normalized rows to import/export. 0 = all.
  --preview N                   Number of rows in HTML preview. Default: 60.
  --min-food-prob N             Food-100K minimum food_prob. Default: 0.8.
  --max-calories N              Skip rows above this kcal value. Default: 1200. 0 = off.
  --max-portion-grams N         Skip rows above this parsed gram portion. Default: 900. 0 = off.
  --allow-placeholder-images    Allow example.com placeholder image URLs.
  --no-require-image            Include rows without image_path.
  --update-existing             Update existing foods matched by normalized name.
  --overwrite                   With --update-existing, replace existing image_path too.
  --food100k PATH               Override MM-Food-100K.csv path.
  --healthy PATH                Override healthy_eating_dataset.csv path.
`;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  switch (arg) {
    case '--dry-run': opts.dryRun = true; break;
    case '--commit': opts.dryRun = false; break;
    case '--source': opts.source = args[++i] || opts.source; break;
    case '--limit': opts.limit = Math.max(0, Number(args[++i] || 0)); break;
    case '--preview': opts.preview = Math.max(0, Number(args[++i] || 0)); break;
    case '--min-food-prob': opts.minFoodProb = Number(args[++i] || opts.minFoodProb); break;
    case '--max-calories': opts.maxCalories = Math.max(0, Number(args[++i] || 0)); break;
    case '--max-portion-grams': opts.maxPortionGrams = Math.max(0, Number(args[++i] || 0)); break;
    case '--allow-placeholder-images': opts.allowPlaceholderImages = true; break;
    case '--no-require-image': opts.requireImage = false; break;
    case '--update-existing': opts.updateExisting = true; break;
    case '--overwrite': opts.overwrite = true; break;
    case '--food100k': opts.food100k = path.resolve(args[++i]); break;
    case '--healthy': opts.healthy = path.resolve(args[++i]); break;
    case '-h':
    case '--help':
      console.log(help.trim());
      process.exit(0);
    default:
      console.error(`Unknown argument: ${arg}`);
      console.error(help.trim());
      process.exit(2);
  }
}

if (!['all', 'food100k', 'healthy'].includes(opts.source)) {
  console.error('--source must be one of: all, food100k, healthy');
  process.exit(2);
}

const normalizeKey = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const safeTrim = (value) => String(value ?? '').trim();

const limitText = (value, maxLength) => {
  const text = safeTrim(value);
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 3)).trimEnd() + '...';
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const round = (value, digits = 2) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const multiplier = 10 ** digits;
  return Math.round(Number(value) * multiplier) / multiplier;
};

const parseJson = (value, fallback) => {
  try {
    if (!safeTrim(value)) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const isPlaceholderImage = (url) => {
  const value = safeTrim(url).toLowerCase();
  return !value || value.includes('example.com/') || value.includes('placeholder');
};

const hasRealImage = (url) => {
  const value = safeTrim(url);
  if (!/^https?:\/\//i.test(value)) return false;
  return !isPlaceholderImage(value);
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const splitCsvLine = (line) => {
  const fields = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
};

async function readCsvRows(filePath, onRow) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV not found: ${filePath}`);
  }

  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let headers = null;
  let rowNumber = 0;

  for await (const rawLine of rl) {
    const line = rowNumber === 0 ? rawLine.replace(/^\uFEFF/, '') : rawLine;
    rowNumber += 1;
    if (!headers) {
      headers = splitCsvLine(line).map((h) => h.trim());
      continue;
    }
    if (!line.trim()) continue;
    const fields = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = fields[index] ?? '';
    });
    await onRow(row, rowNumber);
  }
}

const stats = {
  food100k: { scanned: 0, valid: 0, skipped: {} },
  healthy: { scanned: 0, valid: 0, skipped: {} },
};

const skip = (source, reason) => {
  stats[source].skipped[reason] = (stats[source].skipped[reason] || 0) + 1;
};

const isUsableNutrition = (item) => {
  return item.calories !== null && item.calories > 0
    && item.protein !== null && item.protein >= 0
    && item.carbs !== null && item.carbs >= 0
    && item.fats !== null && item.fats >= 0;
};

const isExcludedFoodName = (name) => {
  const normalized = ` ${normalizeKey(name)} `;
  const excludedPhrases = [
    ' roasted dog ',
    ' grilled dog ',
    ' fried dog ',
    ' boiled dog ',
    ' dog meat ',
    ' dog stew ',
    ' dog soup ',
    ' roasted cat ',
    ' grilled cat ',
    ' fried cat ',
    ' cat meat ',
  ];
  return excludedPhrases.some((phrase) => normalized.includes(phrase));
};

const totalPortionGrams = (portionValues) => {
  if (!Array.isArray(portionValues)) return null;
  let total = 0;
  let found = false;
  for (const part of portionValues) {
    const match = String(part).match(/(-?\d+(?:\.\d+)?)\s*g\b/i);
    if (!match) continue;
    total += Number(match[1]);
    found = true;
  }
  return found ? total : null;
};

const scoreCandidate = (item) => {
  let score = 0;
  if (hasRealImage(item.imagePath)) score += 100;
  if (item.source === 'food100k') score += 30;
  if (item.foodProb !== null) score += Math.round(item.foodProb * 20);
  if (item.calories >= 80 && item.calories <= 900) score += 25;
  if (item.calories > 1200) score -= 25;
  if (item.servingSize) score += 8;
  if (item.ingredients) score += 5;
  if (item.fiber !== null || item.sugar !== null || item.sodium !== null) score += 6;
  if (item.portionGrams !== null && item.portionGrams > 900) score -= 12;
  return score;
};

const makeFood100kItem = (row) => {
  const nutrition = parseJson(row.nutritional_profile, {});
  const ingredients = parseJson(row.ingredients, []);
  const portion = parseJson(row.portion_size, []);
  const name = safeTrim(row.dish_name);
  const foodProb = parseNumber(row.food_prob);
  const imagePath = safeTrim(row.image_url);
  const servingSize = formatServing(name, portion) || safeTrim(row.portion_size) || null;
  const item = {
    source: 'food100k',
    name,
    key: normalizeKey(name),
    category: safeTrim(row.food_type) || 'Food',
    calories: round(parseNumber(nutrition.calories_kcal), 2),
    protein: round(parseNumber(nutrition.protein_g), 2),
    carbs: round(parseNumber(nutrition.carbohydrate_g), 2),
    fats: round(parseNumber(nutrition.fat_g), 2),
    fiber: null,
    sugar: null,
    sodium: null,
    servingSize: servingSize || null,
    imagePath,
    ingredients: Array.isArray(ingredients) ? ingredients.join(', ') : safeTrim(row.ingredients),
    cookingMethod: safeTrim(row.cooking_method) || null,
    foodProb,
    portionGrams: totalPortionGrams(portion),
  };
  item.score = scoreCandidate(item);
  return item;
};

const makeHealthyItem = (row) => {
  const name = safeTrim(row.meal_name);
  const imagePath = safeTrim(row.image_url);
  const mealType = safeTrim(row.meal_type);
  const dietType = safeTrim(row.diet_type);
  const cuisine = safeTrim(row.cuisine);
  const category = [mealType, dietType].filter(Boolean).join(' / ') || cuisine || 'Healthy Eating';
  const servingSizeG = parseNumber(row.serving_size_g);
  const item = {
    source: 'healthy',
    name,
    key: normalizeKey(name),
    category,
    calories: round(parseNumber(row.calories), 2),
    protein: round(parseNumber(row.protein_g), 2),
    carbs: round(parseNumber(row.carbs_g), 2),
    fats: round(parseNumber(row.fat_g), 2),
    fiber: round(parseNumber(row.fiber_g), 2),
    sugar: round(parseNumber(row.sugar_g), 2),
    sodium: round(parseNumber(row.sodium_mg), 2),
    servingSize: servingSizeG
      ? (formatServing(name, `${servingSizeG}g`) || `1 phần (${Math.round(servingSizeG)}g)`)
      : null,
    imagePath,
    ingredients: null,
    cookingMethod: safeTrim(row.cooking_method) || null,
    foodProb: null,
    portionGrams: servingSizeG,
  };
  item.score = scoreCandidate(item);
  return item;
};

const shouldAccept = (item, source) => {
  if (!item.name || !item.key) {
    skip(source, 'missing_name');
    return false;
  }
  if (source === 'food100k' && (item.foodProb === null || item.foodProb < opts.minFoodProb)) {
    skip(source, 'low_food_probability');
    return false;
  }
  if (opts.requireImage && !item.imagePath) {
    skip(source, 'missing_image');
    return false;
  }
  if (opts.requireImage && !hasRealImage(item.imagePath)) {
    if (!opts.allowPlaceholderImages || isPlaceholderImage(item.imagePath)) {
      skip(source, 'placeholder_or_invalid_image');
      return false;
    }
  }
  if (!isUsableNutrition(item)) {
    skip(source, 'missing_nutrition');
    return false;
  }
  if (opts.maxCalories > 0 && item.calories > opts.maxCalories) {
    skip(source, 'high_calories');
    return false;
  }
  if (opts.maxPortionGrams > 0 && item.portionGrams !== null && item.portionGrams > opts.maxPortionGrams) {
    skip(source, 'large_portion');
    return false;
  }
  if (isExcludedFoodName(item.name)) {
    skip(source, 'excluded_name');
    return false;
  }
  return true;
};

async function collectCandidates() {
  const byName = new Map();

  const consider = (item, source) => {
    stats[source].valid += 1;
    const existing = byName.get(item.key);
    if (!existing || item.score > existing.score) {
      byName.set(item.key, item);
    }
  };

  if (opts.source === 'all' || opts.source === 'food100k') {
    await readCsvRows(opts.food100k, async (row) => {
      stats.food100k.scanned += 1;
      const item = makeFood100kItem(row);
      if (shouldAccept(item, 'food100k')) consider(item, 'food100k');
    });
  }

  if (opts.source === 'all' || opts.source === 'healthy') {
    await readCsvRows(opts.healthy, async (row) => {
      stats.healthy.scanned += 1;
      const item = makeHealthyItem(row);
      if (shouldAccept(item, 'healthy')) consider(item, 'healthy');
    });
  }

  const rows = Array.from(byName.values())
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return opts.limit > 0 ? rows.slice(0, opts.limit) : rows;
}

const writeReports = (rows) => {
  fs.mkdirSync(reportsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = path.join(reportsDir, `food_catalog_normalized_${stamp}.csv`);
  const htmlPath = path.join(reportsDir, `food_catalog_preview_${stamp}.html`);

  const headers = [
    'source',
    'name',
    'category',
    'calories',
    'protein',
    'carbs',
    'fats',
    'fiber',
    'sugar',
    'sodium',
    'servingSize',
    'imagePath',
    'ingredients',
    'cookingMethod',
  ];
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
  fs.writeFileSync(csvPath, csv, 'utf8');

  const previewRows = rows.slice(0, opts.preview);
  const cards = previewRows.map((row) => `
    <article class="card">
      <img src="${escapeHtml(row.imagePath)}" alt="${escapeHtml(row.name)}" loading="lazy">
      <div class="body">
        <div class="topline">
          <span>${escapeHtml(row.source)}</span>
          <span>${escapeHtml(row.category)}</span>
        </div>
        <h2>${escapeHtml(row.name)}</h2>
        <div class="serving">${escapeHtml(row.servingSize || 'Serving size not provided')}</div>
        <dl class="macros">
          <div><dt>Calories</dt><dd>${escapeHtml(row.calories)} kcal</dd></div>
          <div><dt>Protein</dt><dd>${escapeHtml(row.protein)} g</dd></div>
          <div><dt>Carbs</dt><dd>${escapeHtml(row.carbs)} g</dd></div>
          <div><dt>Fat</dt><dd>${escapeHtml(row.fats)} g</dd></div>
          <div><dt>Fiber</dt><dd>${row.fiber === null ? '-' : `${escapeHtml(row.fiber)} g`}</dd></div>
          <div><dt>Sugar</dt><dd>${row.sugar === null ? '-' : `${escapeHtml(row.sugar)} g`}</dd></div>
          <div><dt>Sodium</dt><dd>${row.sodium === null ? '-' : `${escapeHtml(row.sodium)} mg`}</dd></div>
        </dl>
        ${row.ingredients ? `<p class="ingredients">${escapeHtml(row.ingredients)}</p>` : ''}
        ${row.cookingMethod ? `<div class="method">${escapeHtml(row.cookingMethod)}</div>` : ''}
      </div>
    </article>
  `).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Food Catalog Dataset Preview</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f7f4;
      --panel: #ffffff;
      --ink: #1f2933;
      --muted: #667085;
      --line: #d9ded6;
      --accent: #287a5f;
      --accent-2: #a4472a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      letter-spacing: 0;
    }
    header {
      padding: 24px clamp(16px, 4vw, 48px) 18px;
      border-bottom: 1px solid var(--line);
      background: #fff;
    }
    h1 {
      margin: 0 0 8px;
      font-size: clamp(24px, 3vw, 34px);
      line-height: 1.15;
    }
    .summary {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }
    main {
      padding: 22px clamp(16px, 4vw, 48px) 42px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }
    .card {
      min-width: 0;
      overflow: hidden;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
    }
    .card img {
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      background: #e7ebe4;
    }
    .body { padding: 14px; }
    .topline {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: var(--accent);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    h2 {
      margin: 8px 0 6px;
      font-size: 18px;
      line-height: 1.25;
    }
    .serving,
    .method {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
    }
    .macros {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 12px 0;
    }
    .macros div {
      min-width: 0;
      padding: 8px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfa;
    }
    dt {
      color: var(--muted);
      font-size: 11px;
      margin-bottom: 3px;
    }
    dd {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .ingredients {
      margin: 0 0 10px;
      color: #344054;
      font-size: 13px;
      line-height: 1.45;
    }
    .method {
      color: var(--accent-2);
      font-weight: 700;
    }
  </style>
</head>
<body>
  <header>
    <h1>Food Catalog Dataset Preview</h1>
    <p class="summary">
      ${rows.length} normalized foods ready for review. Showing ${previewRows.length}.
      Dry-run generated from local datasets; use <code>node scripts/import_food_datasets.js --commit</code> to write to MySQL.
    </p>
  </header>
  <main>
    <section class="grid">
      ${cards}
    </section>
  </main>
</body>
</html>`;
  fs.writeFileSync(htmlPath, html, 'utf8');

  return { csvPath, htmlPath };
};

async function ensureCatalogSchema(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS foodcategories (
      category_id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(255) NOT NULL UNIQUE
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS foods (
      food_id INT AUTO_INCREMENT PRIMARY KEY,
      food_name VARCHAR(255) NOT NULL,
      category_id INT NULL,
      calories DECIMAL(10,2),
      protein DECIMAL(10,2),
      carbs DECIMAL(10,2),
      fat DECIMAL(10,2),
      fiber DECIMAL(10,2),
      sugar DECIMAL(10,2),
      sodium DECIMAL(10,2),
      serving_size VARCHAR(100),
      image_path VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_foods_category FOREIGN KEY (category_id) REFERENCES foodcategories(category_id) ON DELETE SET NULL,
      INDEX idx_foods_category (category_id)
    )
  `).catch(async (error) => {
    if (!/Duplicate key name|errno: 121|errno: 1826/i.test(String(error.message))) throw error;
  });
}

async function connectDb() {
  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  const database = process.env.DB_NAME || 'calai';
  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${String(database).replace(/`/g, '``')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await rootConn.end();

  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
    waitForConnections: true,
    connectionLimit: 5,
  });
}

const { normalizeMealSlot } = require('./_foodCategory');
const { formatServing } = require('./_servingSize');

async function getCategoryId(conn, cache, categoryName, foodName) {
  const normalized = normalizeMealSlot(categoryName, foodName);
  const key = normalized.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const [existing] = await conn.query(
    'SELECT category_id FROM foodcategories WHERE LOWER(category_name) = LOWER(?) LIMIT 1',
    [normalized]
  );
  if (existing[0]) {
    cache.set(key, existing[0].category_id);
    return existing[0].category_id;
  }

  const [inserted] = await conn.query(
    'INSERT INTO foodcategories (category_name) VALUES (?)',
    [normalized]
  );
  cache.set(key, inserted.insertId);
  return inserted.insertId;
}

async function importRows(rows) {
  const conn = await connectDb();
  await ensureCatalogSchema(conn);

  const [existingFoods] = await conn.query('SELECT food_id, food_name, image_path FROM foods ORDER BY food_id');
  const existingByKey = new Map();
  for (const food of existingFoods) {
    const key = normalizeKey(food.food_name);
    if (!existingByKey.has(key)) existingByKey.set(key, food);
  }

  const categoryCache = new Map();
  const summary = { inserted: 0, updated: 0, skippedExisting: 0 };
  const connection = await conn.getConnection();

  try {
    await connection.beginTransaction();
    for (const row of rows) {
      const existing = existingByKey.get(row.key);
      const categoryId = await getCategoryId(connection, categoryCache, row.category, row.name);

      if (existing && !opts.updateExisting) {
        summary.skippedExisting += 1;
        continue;
      }

      if (existing && opts.updateExisting) {
        const imagePath = opts.overwrite || !safeTrim(existing.image_path) ? row.imagePath : existing.image_path;
        await connection.query(
          `
            UPDATE foods
            SET food_name = ?, category_id = ?, calories = ?, protein = ?, carbs = ?, fat = ?,
                fiber = ?, sugar = ?, sodium = ?, serving_size = ?, image_path = ?
            WHERE food_id = ?
          `,
          [
            row.name,
            categoryId,
            row.calories,
            row.protein,
            row.carbs,
            row.fats,
            row.fiber,
            row.sugar,
            row.sodium,
            limitText(row.servingSize, 100),
            imagePath,
            existing.food_id,
          ]
        );
        summary.updated += 1;
        continue;
      }

      await connection.query(
        `
          INSERT INTO foods
            (food_name, category_id, calories, protein, carbs, fat, fiber, sugar, sodium, serving_size, image_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          row.name,
          categoryId,
          row.calories,
          row.protein,
          row.carbs,
          row.fats,
          row.fiber,
          row.sugar,
          row.sodium,
          limitText(row.servingSize, 100),
          row.imagePath,
        ]
      );
      existingByKey.set(row.key, { food_id: -1, food_name: row.name, image_path: row.imagePath });
      summary.inserted += 1;
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await conn.end();
  }

  return summary;
}

const printStats = (rows, reportPaths) => {
  console.log('\nDataset scan');
  for (const source of ['food100k', 'healthy']) {
    const entry = stats[source];
    if (!entry.scanned) continue;
    const skipped = Object.entries(entry.skipped)
      .map(([reason, count]) => `${reason}=${count}`)
      .join('  ') || 'none';
    console.log(`  ${source}: scanned=${entry.scanned} valid=${entry.valid} skipped: ${skipped}`);
  }
  console.log(`\nNormalized foods ready: ${rows.length}`);
  console.log(`CSV report : ${reportPaths.csvPath}`);
  console.log(`HTML preview: ${reportPaths.htmlPath}`);
  console.log('\nSample rows');
  for (const row of rows.slice(0, Math.min(10, rows.length))) {
    console.log(`  - ${row.name} | ${row.calories} kcal | P ${row.protein}g C ${row.carbs}g F ${row.fats}g | image=${row.imagePath ? 'yes' : 'no'}`);
  }
};

(async () => {
  const rows = await collectCandidates();
  const reportPaths = writeReports(rows);
  printStats(rows, reportPaths);

  if (opts.dryRun) {
    console.log('\n[dry-run] No database changes written. Re-run with --commit to import.');
    return;
  }

  const summary = await importRows(rows);
  console.log(`\n[commit] inserted=${summary.inserted} updated=${summary.updated} skippedExisting=${summary.skippedExisting}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
