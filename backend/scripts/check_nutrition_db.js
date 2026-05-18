'use strict';

// Kiểm tra tính hợp lý của chỉ số dinh dưỡng trong DB foods table.
// Atwater: expected_kcal = 4×protein + 4×carbs + 9×fat

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await conn.query(`
    SELECT food_id, food_name, calories, protein, carbs, fat
    FROM foods
    ORDER BY food_id
  `);

  console.log(`📊 Phân tích ${rows.length} món trong DB`);
  console.log('='.repeat(72));

  const analysed = rows.map((r) => {
    const cal = Number(r.calories ?? 0);
    const p = Number(r.protein ?? 0);
    const c = Number(r.carbs ?? 0);
    const f = Number(r.fat ?? 0);
    const expected = 4 * p + 4 * c + 9 * f;
    const diff = Math.abs(cal - expected);
    const pct = expected > 0 ? (diff / expected) * 100 : (cal > 0 ? 100 : 0);
    return { id: r.food_id, name: r.food_name, cal, p, c, f, expected: Math.round(expected), diff: Math.round(diff), pct };
  });

  const issues = {
    negative: analysed.filter((r) => r.cal < 0 || r.p < 0 || r.c < 0 || r.f < 0),
    zeroCal: analysed.filter((r) => r.cal === 0),
    zeroMacros: analysed.filter((r) => r.cal > 0 && r.p === 0 && r.c === 0 && r.f === 0),
    huge: analysed.filter((r) => r.cal > 2000),
    moderate: analysed.filter((r) => r.pct > 30 && r.pct <= 60 && r.expected > 0),
    severe: analysed.filter((r) => r.pct > 60 && r.pct <= 100 && r.expected > 0),
    extreme: analysed.filter((r) => r.pct > 100 && r.expected > 0),
  };

  console.log(`Giá trị âm                 : ${issues.negative.length}`);
  console.log(`Calories = 0               : ${issues.zeroCal.length}`);
  console.log(`Có cal nhưng P=C=F=0       : ${issues.zeroMacros.length}`);
  console.log(`Calories > 2000            : ${issues.huge.length}`);
  console.log(`Lệch 30-60% Atwater        : ${issues.moderate.length}`);
  console.log(`Lệch 60-100% Atwater       : ${issues.severe.length}`);
  console.log(`Lệch > 100% (very bad)     : ${issues.extreme.length}`);

  const validRows = analysed.filter((r) => r.expected > 0);
  if (validRows.length) {
    const avgPct = validRows.reduce((s, r) => s + r.pct, 0) / validRows.length;
    const median = [...validRows].sort((a, b) => a.pct - b.pct)[Math.floor(validRows.length / 2)].pct;
    console.log(`Lệch trung bình            : ${avgPct.toFixed(1)}%`);
    console.log(`Lệch median (giữa list)    : ${median.toFixed(1)}%`);
  }

  const problematic =
    issues.negative.length + issues.zeroCal.length + issues.zeroMacros.length +
    issues.moderate.length + issues.severe.length + issues.extreme.length;
  const good = analysed.length - problematic;
  console.log(`\n✅ Hợp lý (lệch ≤ 30%)     : ${good} / ${analysed.length}  (${((good / analysed.length) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Có vấn đề              : ${problematic} / ${analysed.length}  (${((problematic / analysed.length) * 100).toFixed(1)}%)`);

  const printSample = (label, list, n = 8) => {
    if (list.length === 0) return;
    console.log(`\n${'─'.repeat(72)}\n${label} (top ${Math.min(n, list.length)} / ${list.length}):`);
    list.slice(0, n).forEach((r) => {
      console.log(`  [${String(r.id).padStart(5)}] "${(r.name || '').slice(0, 40).padEnd(40)}"  P${r.p}g C${r.c}g F${r.f}g  cal=${r.cal} (Atwater ${r.expected}, lệch ${r.pct.toFixed(0)}%)`);
    });
  };

  printSample('🔴 Extreme >100% (cal khác xa Atwater)', issues.extreme.sort((a, b) => b.pct - a.pct));
  printSample('🟠 Severe 60-100%', issues.severe.sort((a, b) => b.pct - a.pct));
  printSample('🟡 Moderate 30-60%', issues.moderate.sort((a, b) => b.pct - a.pct));
  printSample('🟣 Calories > 2000 (1 phần)', issues.huge.sort((a, b) => b.cal - a.cal));
  printSample('⚫ Calories=0 (data trống)', issues.zeroCal);
  printSample('⚪ Có cal nhưng P=C=F=0', issues.zeroMacros);

  await conn.end();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
