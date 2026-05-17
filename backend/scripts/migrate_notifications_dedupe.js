const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const hasColumn = async (conn, table, column) => {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME || 'calai', table, column]
  );
  return Number(rows[0].cnt) > 0;
};

const hasIndex = async (conn, table, indexName) => {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [process.env.DB_NAME || 'calai', table, indexName]
  );
  return Number(rows[0].cnt) > 0;
};

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'calai',
  });

  try {
    if (!(await hasColumn(conn, 'notifications', 'dedupe_key'))) {
      await conn.query(
        `ALTER TABLE notifications ADD COLUMN dedupe_key VARCHAR(255) NULL AFTER data`
      );
      console.log('[migrate] added column dedupe_key');
    } else {
      console.log('[migrate] column dedupe_key already exists');
    }

    if (!(await hasIndex(conn, 'notifications', 'uk_user_dedupe'))) {
      await conn.query(
        `ALTER TABLE notifications ADD UNIQUE KEY uk_user_dedupe (user_id, dedupe_key)`
      );
      console.log('[migrate] added unique key uk_user_dedupe');
    } else {
      console.log('[migrate] unique key already exists');
    }
  } catch (err) {
    console.error('[migrate] FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
