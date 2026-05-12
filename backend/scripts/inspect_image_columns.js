'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'calai',
  });

  const targets = [
    { table: 'foods', col: 'image_path' },
    { table: 'foodimages', col: 'image_url' },
    { table: 'chatmessages', col: 'image_url' },
    { table: 'chatmessages', col: 'image_name' },
  ];

  for (const t of targets) {
    try {
      const [[total]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t.table}\``);
      const [[withVal]] = await conn.query(
        `SELECT COUNT(*) AS n FROM \`${t.table}\` WHERE \`${t.col}\` IS NOT NULL AND \`${t.col}\` <> ''`
      );
      const [samples] = await conn.query(
        `SELECT \`${t.col}\` AS v FROM \`${t.table}\` WHERE \`${t.col}\` IS NOT NULL AND \`${t.col}\` <> '' LIMIT 5`
      );
      console.log(`\n${t.table}.${t.col}`);
      console.log(`  total rows  : ${total.n}`);
      console.log(`  with value  : ${withVal.n}`);
      samples.forEach((s, i) => {
        const v = String(s.v);
        const short = v.length > 100 ? v.slice(0, 80) + ` …(${v.length} chars)` : v;
        console.log(`  sample[${i}]: ${short}`);
      });
    } catch (e) {
      console.log(`\n${t.table}.${t.col}: ERR ${e.message}`);
    }
  }

  await conn.end();
})();
