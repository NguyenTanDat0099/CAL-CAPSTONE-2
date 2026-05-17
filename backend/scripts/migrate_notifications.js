const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const NOTIFICATIONS_SQL = `
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('meal_reminder','daily_summary','goal_achievement','system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON NULL,
    is_read TINYINT NOT NULL DEFAULT 0,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_user_read (user_id, is_read),
    INDEX idx_notifications_user_sent (user_id, sent_at)
)`;

const JOBRUNS_SQL = `
CREATE TABLE IF NOT EXISTS notificationjobruns (
    run_id INT AUTO_INCREMENT PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    status ENUM('running','success','failed') NOT NULL DEFAULT 'running',
    notifications_created INT NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    INDEX idx_jobruns_name_time (job_name, started_at)
)`;

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'calai',
    multipleStatements: false,
  });

  try {
    await connection.query(NOTIFICATIONS_SQL);
    console.log('[migrate] notifications: OK');
    await connection.query(JOBRUNS_SQL);
    console.log('[migrate] notificationjobruns: OK');

    const [rows] = await connection.query(
      `SELECT TABLE_NAME, TABLE_ROWS
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('notifications','notificationjobruns')`,
      [process.env.DB_NAME || 'calai']
    );
    console.log('[migrate] verify:', rows);
  } catch (err) {
    console.error('[migrate] FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
})();
