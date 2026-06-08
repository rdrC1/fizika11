module.exports = {
  apps: [
    {
      name: "prolisim",
      script: "serve",
      watch: false,
      env: {
        PM2_SERVE_PATH: ".",
        PM2_SERVE_PORT: 8080,
        PM2_SERVE_SPA: "true",
        PM2_SERVE_HOMEPAGE: "./index.html"
      },
      env_production: {
        PM2_SERVE_PORT: 8080
      }
    }
  ]
};
