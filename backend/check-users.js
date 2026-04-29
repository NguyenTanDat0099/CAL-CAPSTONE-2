const mysql = require('mysql2/promise');

async function checkUsers() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'NewPassword123!',
    database: 'calai',
  });

  const [rows] = await pool.query("SELECT account_id, email, status FROM accounts");
  console.log('All accounts in database:');
  rows.forEach(r => console.log(`  - ${r.email} (status: ${r.status})`));
  console.log(`\nTotal: ${rows.length} account(s)`);

  await pool.end();
}

checkUsers().catch(console.error);
