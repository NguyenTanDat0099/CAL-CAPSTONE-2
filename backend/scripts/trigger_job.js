// Helper: login as admin, trigger a notification job via HTTP, print result.
//
// Usage:
//   node scripts/trigger_job.js <job_name>
//
// Examples:
//   node scripts/trigger_job.js meal_reminder
//   node scripts/trigger_job.js daily_summary
//   node scripts/trigger_job.js goal_achievement
//   node scripts/trigger_job.js cleanup
//
// Requires backend dev server running on localhost:<PORT>.
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 3000;
const BASE = `http://localhost:${PORT}`;
const ADMIN_EMAIL = 'admin@calai.local';
const ADMIN_PASSWORD = 'Admin123!';

(async () => {
  const jobName = process.argv[2];
  if (!jobName) {
    console.error('Usage: node scripts/trigger_job.js <job_name>');
    console.error('  job_name: meal_reminder | daily_summary | goal_achievement | cleanup');
    process.exit(1);
  }

  try {
    // 1) Login → token
    console.log(`Logging in as ${ADMIN_EMAIL}...`);
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    if (!loginRes.ok) {
      console.error(`Login failed: HTTP ${loginRes.status}`);
      console.error(await loginRes.text());
      process.exit(1);
    }
    const loginData = await loginRes.json();
    const token = loginData.data?.token || loginData.token;
    if (!token) {
      console.error('No token in response:', loginData);
      process.exit(1);
    }
    console.log(`Got token (length ${token.length}, role=${loginData.data?.role || loginData.role})`);

    // 2) Trigger job
    console.log(`\nTriggering job: ${jobName}...`);
    const triggerRes = await fetch(
      `${BASE}/api/admin/notifications/trigger/${jobName}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!triggerRes.ok) {
      console.error(`Trigger failed: HTTP ${triggerRes.status}`);
      console.error(await triggerRes.text());
      process.exit(1);
    }
    console.log('Trigger response:', await triggerRes.json());

    // 3) Show last 5 job runs
    console.log('\nLast 5 job runs:');
    const runsRes = await fetch(`${BASE}/api/admin/notifications/runs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const runsData = await runsRes.json();
    const runs = runsData.runs || [];
    console.table(
      runs.slice(0, 5).map((r) => ({
        run_id: r.run_id,
        job: r.job_name,
        status: r.status,
        created: r.notifications_created,
        started: r.started_at,
      }))
    );
  } catch (err) {
    console.error('FAILED:', err.message);
    process.exitCode = 1;
  }
})();
