// Creates a meal schedule item due ~1 minute from now so the cron job fires
// it on the next tick. Does NOT clean up — pair with test_meal_reminder_cleanup.js.
//
// Usage:
//   node scripts/test_meal_reminder_setup.js [user_id] [minutes_from_now] [meal_type]
//
// meal_type: breakfast | lunch | dinner | snack  (default = auto-pick by hour)
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');

const TEST_TAG = 'TEST_MEAL_REMINDER';

const pickMealTypeByHour = (hour) => {
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'snack';
  return 'dinner';
};

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

(async () => {
  const cliUserId = Number(process.argv[2]);
  const minutesAhead = Number(process.argv[3] || 1);
  const cliMealType = (process.argv[4] || '').toLowerCase();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'calai',
  });

  try {
    let userId = cliUserId;
    if (!userId) {
      const [rows] = await conn.query('SELECT user_id FROM users LIMIT 1');
      if (rows.length === 0) throw new Error('No users in DB');
      userId = rows[0].user_id;
    }

    // Compute target time: round NOW to next minute + minutesAhead
    const now = new Date();
    const target = new Date(now);
    target.setSeconds(0, 0);
    target.setMinutes(target.getMinutes() + minutesAhead);
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    const scheduledTime = `${hh}:${mm}:00`;

    const mealType = VALID_MEAL_TYPES.includes(cliMealType)
      ? cliMealType
      : pickMealTypeByHour(target.getHours());

    const [s] = await conn.query(
      `INSERT INTO mealschedules (user_id, name, description, start_date, end_date, source)
       VALUES (?, ?, ?, CURDATE(), CURDATE(), 'manual')`,
      [userId, TEST_TAG, 'cron-fire test schedule']
    );
    const scheduleId = s.insertId;

    const [i] = await conn.query(
      `INSERT INTO mealscheduleitems
         (schedule_id, day_offset, meal_type, scheduled_time, name, sort_order)
       VALUES (?, 0, ?, ?, ?, 0)`,
      [scheduleId, mealType, scheduledTime, 'Phở bò TEST']
    );

    console.log('─────────────────────────────────────────────');
    console.log(`  Test schedule created`);
    console.log(`  user_id     = ${userId}`);
    console.log(`  schedule_id = ${scheduleId}`);
    console.log(`  item_id     = ${i.insertId}`);
    console.log(`  meal_type   = ${mealType}`);
    console.log(`  fires at    = ${hh}:${mm} (server local time)`);
    console.log(`  fires in    = ~${minutesAhead} minute(s)`);
    console.log('─────────────────────────────────────────────');
    console.log('Next steps:');
    console.log('  1. Make sure backend is running: npm run dev');
    console.log(`  2. Wait until ${hh}:${mm} — watch backend console for:`);
    console.log(`     [job:meal_reminder] created 1 notification(s) from 1 due item(s)`);
    console.log('  3. Verify in MySQL:');
    console.log(`     SELECT * FROM notifications WHERE user_id=${userId} ORDER BY sent_at DESC LIMIT 5;`);
    console.log('  4. Cleanup: node scripts/test_meal_reminder_cleanup.js');
  } catch (err) {
    console.error('FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
