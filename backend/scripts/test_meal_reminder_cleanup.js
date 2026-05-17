// Cleans up data created by test_meal_reminder_setup.js
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');
const TEST_TAG = 'TEST_MEAL_REMINDER';

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'calai',
  });

  try {
    // Delete the schedules (cascades to items via FK)
    const [s] = await conn.query(`DELETE FROM mealschedules WHERE name = ?`, [TEST_TAG]);
    console.log(`Deleted ${s.affectedRows} test schedule(s)`);

    // Delete the test notifications
    const [n] = await conn.query(
      `DELETE FROM notifications
       WHERE type = 'meal_reminder'
         AND message LIKE '%Phở bò TEST%'`
    );
    console.log(`Deleted ${n.affectedRows} test notification(s)`);
  } catch (err) {
    console.error('FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
