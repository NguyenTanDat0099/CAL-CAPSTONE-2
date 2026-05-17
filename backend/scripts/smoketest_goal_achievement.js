// E2E smoke test for goal_achievement job — tests calorie, weight, streak.
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { runGoalAchievementJob } = require('../dist/notifications/jobs/goal-achievement.job');
const pool = require('../dist/shared/database/db').default;

const showLatest = async (userId, label) => {
  const [rows] = await pool.query(
    `SELECT title, message, dedupe_key, JSON_EXTRACT(data,'$.goalType') AS goal_type
     FROM notifications
     WHERE user_id = ? AND type = 'goal_achievement'
     ORDER BY sent_at DESC LIMIT 1`,
    [userId]
  );
  console.log(`  [${label}]`, rows[0] || 'NONE');
};

const deleteGoalNotifs = async (userId) => {
  await pool.query(`DELETE FROM notifications WHERE user_id = ? AND type='goal_achievement'`, [userId]);
};

(async () => {
  const CLEANUP = { logs: [], weights: [], notifUsers: new Set() };

  try {
    // Pick a user with goal+target_calories
    const [users] = await pool.query(
      `SELECT u.user_id, g.target_calories, g.target_weight, g.goal_type
       FROM users u JOIN usergoals g ON g.user_id = u.user_id
       ORDER BY g.goal_id DESC LIMIT 1`
    );
    if (users.length === 0) throw new Error('No user with goal');
    const u = users[0];
    const target = Number(u.target_calories);
    CLEANUP.notifUsers.add(u.user_id);
    console.log(`Using user_id=${u.user_id}, target_cal=${target}, target_w=${u.target_weight}, goal_type=${u.goal_type}`);

    // ── Case A: hit daily calorie target ─────────────────────────
    console.log('\n── Case A: calorie target hit ──');
    await pool.query(
      `INSERT INTO dailynutritionlogs (user_id, date, total_calories, total_protein, total_carbs, total_fat)
       VALUES (?, CURDATE(), ?, 0, 0, 0)
       ON DUPLICATE KEY UPDATE total_calories=VALUES(total_calories)`,
      [u.user_id, target]
    );
    CLEANUP.logs.push(u.user_id);
    await deleteGoalNotifs(u.user_id);
    await runGoalAchievementJob();
    await showLatest(u.user_id, 'calorie');

    // ── Case B: weight goal reached ──────────────────────────────
    console.log('\n── Case B: weight goal reached ──');
    // Insert a weight matching the target (within 0.5kg)
    const targetW = Number(u.target_weight);
    const [w] = await pool.query(
      `INSERT INTO weight_history (user_id, weight, source, note)
       VALUES (?, ?, 'smoketest', 'TEST_GOAL_ACHIEVEMENT')`,
      [u.user_id, targetW]
    );
    CLEANUP.weights.push(w.insertId);
    await deleteGoalNotifs(u.user_id);
    await runGoalAchievementJob();
    await showLatest(u.user_id, 'weight');

    // ── Case C: streak milestone (3 days) ────────────────────────
    console.log('\n── Case C: 3-day streak ──');
    // Insert today + yesterday + day-before logs
    for (let offset = 0; offset < 3; offset++) {
      await pool.query(
        `INSERT INTO dailynutritionlogs (user_id, date, total_calories, total_protein, total_carbs, total_fat)
         VALUES (?, DATE_SUB(CURDATE(), INTERVAL ? DAY), 100, 0, 0, 0)
         ON DUPLICATE KEY UPDATE total_calories=VALUES(total_calories)`,
        [u.user_id, offset]
      );
    }
    await deleteGoalNotifs(u.user_id);
    await runGoalAchievementJob();
    // Streak fires alongside calorie/weight — list ALL for this user
    const [all] = await pool.query(
      `SELECT title, message, dedupe_key FROM notifications
       WHERE user_id = ? AND type='goal_achievement' ORDER BY notification_id DESC`,
      [u.user_id]
    );
    console.log('  all goal notifs after 3-day streak:');
    all.forEach((r) => console.log('    ·', r.title, '|', r.dedupe_key));

    // ── Dedupe check ─────────────────────────────────────────────
    console.log('\n── Dedupe check ──');
    const [b] = await pool.query(`SELECT COUNT(*) AS cnt FROM notifications WHERE user_id=? AND type='goal_achievement'`, [u.user_id]);
    await runGoalAchievementJob();
    const [a] = await pool.query(`SELECT COUNT(*) AS cnt FROM notifications WHERE user_id=? AND type='goal_achievement'`, [u.user_id]);
    console.log(`  before=${b[0].cnt}  after=${a[0].cnt}  ${b[0].cnt === a[0].cnt ? 'DEDUPE OK' : 'DUPLICATE!'}`);
  } catch (err) {
    console.error('FAILED:', err);
    process.exitCode = 1;
  } finally {
    // Cleanup
    for (const uid of CLEANUP.logs) {
      await pool.query(
        `DELETE FROM dailynutritionlogs WHERE user_id = ?
         AND date >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)`,
        [uid]
      );
    }
    for (const wid of CLEANUP.weights) {
      await pool.query(`DELETE FROM weight_history WHERE weight_history_id = ?`, [wid]);
    }
    for (const uid of CLEANUP.notifUsers) {
      await pool.query(`DELETE FROM notifications WHERE user_id = ? AND type='goal_achievement'`, [uid]);
    }
    console.log('\nCleanup OK');
    await pool.end();
  }
})();
