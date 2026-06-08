module.exports = {
  apps: [
    {
      name: "prolisim",
      script: "server.js",
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
