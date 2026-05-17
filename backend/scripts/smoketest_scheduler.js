// One-off smoke test: load compiled scheduler, run cleanup job, dump job run rows.
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { runCleanupJob } = require('../dist/notifications/jobs/cleanup.job');
const { listRecentJobRuns } = require('../dist/notifications/services/notification.service');
const pool = require('../dist/shared/database/db').default;

(async () => {
  try {
    await runCleanupJob();
    const runs = await listRecentJobRuns(5);
    console.log('Recent job runs:', runs);
  } catch (err) {
    console.error('smoketest failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
