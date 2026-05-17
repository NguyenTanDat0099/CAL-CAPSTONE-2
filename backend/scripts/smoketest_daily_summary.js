// End-to-end smoke test for daily_summary job.
// Tests all 4 message branches by varying total_calories vs target.
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { runDailySummaryJob } = require('../dist/notifications/jobs/daily-summary.job');
const pool = require('../dist/shared/database/db').default;

const upsertLog = async (userId, calories, protein, carbs, fat) => {
  await pool.query(
    `INSERT INTO dailynutritionlogs (user_id, date, total_calories, total_protein, total_carbs, total_fat)
     VALUES (?, CURDATE(), ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_calories = VALUES(total_calories),
       total_protein = VALUES(total_protein),
       total_carbs = VALUES(total_carbs),
       total_fat = VALUES(total_fat)`,
    [userId, calories, protein, carbs, fat]
  );
};

const deleteNotif = async (userId) => {
  await pool.query(
    `DELETE FROM notifications WHERE user_id = ? AND type = 'daily_summary' AND DATE(sent_at) = CURDATE()`,
    [userId]
  );
};

const showLatest = async (userId, label) => {
  const [rows] = await pool.query(
    `SELECT title, message, JSON_EXTRACT(data, '$.status') AS status, dedupe_key
     FROM notifications
     WHERE user_id = ? AND type = 'daily_summary'
     ORDER BY sent_at DESC LIMIT 1`,
    [userId]
  );
  console.log(`  [${label}]`, rows[0] || 'NONE');
};

(async () => {
  const TEST_USER_IDS = [];
  try {
    // Pick 1 user with goal set
    const [withGoal] = await pool.query(
      `SELECT u.user_id, g.target_calories FROM users u
       JOIN usergoals g ON g.user_id = u.user_id
       ORDER BY g.goal_id DESC LIMIT 1`
    );
    if (withGoal.length === 0) throw new Error('No user with goal');
    const user = withGoal[0];
    TEST_USER_IDS.push(user.user_id);
    const target = Number(user.target_calories);
    console.log(`Using user_id=${user.user_id}, target_calories=${target}`);

    // ── Case A: under (60% of target) ───────────────────────────
    console.log('\n── Case A: under target ──');
    await upsertLog(user.user_id, Math.round(target * 0.6), 30, 80, 20);
    await deleteNotif(user.user_id);
    await runDailySummaryJob();
    await showLatest(user.user_id, 'under');

    // ── Case B: on_target (100%) ────────────────────────────────
    console.log('\n── Case B: on target ──');
    await upsertLog(user.user_id, target, 100, 250, 60);
    await deleteNotif(user.user_id);
    await runDailySummaryJob();
    await showLatest(user.user_id, 'on_target');

    // ── Case C: over (130%) ─────────────────────────────────────
    console.log('\n── Case C: over target ──');
    await upsertLog(user.user_id, Math.round(target * 1.3), 130, 350, 80);
    await deleteNotif(user.user_id);
    await runDailySummaryJob();
    await showLatest(user.user_id, 'over');

    // ── Case D: no target ───────────────────────────────────────
    const [noGoal] = await pool.query(
      `SELECT user_id FROM users
       WHERE user_id NOT IN (SELECT user_id FROM usergoals)
       LIMIT 1`
    );
    if (noGoal.length > 0) {
      console.log('\n── Case D: no target ──');
      const u2 = noGoal[0].user_id;
      TEST_USER_IDS.push(u2);
      await upsertLog(u2, 1500, 50, 200, 40);
      await deleteNotif(u2);
      await runDailySummaryJob();
      await showLatest(u2, 'no_target');
    } else {
      console.log('\n── Case D: no target ── SKIPPED (all users have goals)');
    }

    // ── Dedupe check: run again, count should not increase ──────
    console.log('\n── Dedupe check ──');
    const [before] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM notifications WHERE type='daily_summary' AND DATE(sent_at)=CURDATE()`
    );
    await runDailySummaryJob();
    const [after] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM notifications WHERE type='daily_summary' AND DATE(sent_at)=CURDATE()`
    );
    console.log(`  before=${before[0].cnt}  after=${after[0].cnt}  ${before[0].cnt === after[0].cnt ? 'DEDUPE OK' : 'DUPLICATE!'}`);
  } catch (err) {
    console.error('FAILED:', err);
    process.exitCode = 1;
  } finally {
    // Cleanup: delete today's test logs + notifications
    for (const uid of TEST_USER_IDS) {
      await pool.query(`DELETE FROM dailynutritionlogs WHERE user_id = ? AND date = CURDATE()`, [uid]);
      await pool.query(`DELETE FROM notifications WHERE user_id = ? AND type='daily_summary' AND DATE(sent_at)=CURDATE()`, [uid]);
    }
    console.log('\nCleanup OK');
    await pool.end();
  }
})();
