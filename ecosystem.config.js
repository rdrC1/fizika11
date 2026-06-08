module.exports = {
  apps: [
    {
      name: "prolisim",
      script: "server.js",
      cwd: __dirname,
      watch: false,
      env: {
        PORT: 34927
      },
      env_production: {
        PORT: 34927
      }
    }
  ]
};
