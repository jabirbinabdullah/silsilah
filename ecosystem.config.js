module.exports = {
  apps : [{
    name: "silsilah-backend",
    script: "npm",
    args: ["run", "start:dev"],
    cwd: "./backend", // Execute npm commands within the backend directory
    watch: false,
    env: {
      "NODE_ENV": "development",
    },
    output: "../pm2-backend-output.log",
    error: "../pm2-backend-error.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
  }]
};
