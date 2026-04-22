/**
 * Configuración de PM2 para el servidor de producción.
 * Uso: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "asistencias",
      script: "node",
      args: "dist/server/_core/index.js",
      cwd: "/var/www/asistencias",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      // Reiniciar automáticamente si el proceso cae
      autorestart: true,
      // Número de reinicios antes de marcar como error
      max_restarts: 10,
      // Tiempo mínimo entre reinicios (ms)
      min_uptime: "10s",
      // Logs
      out_file: "/var/log/asistencias/out.log",
      error_file: "/var/log/asistencias/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Usar modo fork (no cluster) para simplificar
      exec_mode: "fork",
      instances: 1,
    },
  ],
};
