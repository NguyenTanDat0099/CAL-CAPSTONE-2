// pm2 ecosystem for the Express backend.
//
// Usage:
//   cd /home/tarou/cap2/backend && npm run build
//   pm2 start /home/tarou/cap2/deploy/ecosystem.config.js
//   pm2 save && pm2 startup     # to survive reboots
//
// Cluster mode forks one Node process per CPU core, sharing the same listening
// socket. Combined with the nginx upstream pool, this gives true parallel
// request handling for the auth / chat orchestration layer.

module.exports = {
  apps: [
    {
      name: "calai-backend",
      script: "dist/server.js",
      cwd: "/home/tarou/cap2/backend",
      instances: "max",          // one worker per CPU
      exec_mode: "cluster",
      max_memory_restart: "512M",
      kill_timeout: 5000,
      restart_delay: 2000,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Each cluster worker reuses PORT via the master, so nginx still sees
      // a single 127.0.0.1:3000 upstream — no conflict with the pool above.
    },
  ],
};
