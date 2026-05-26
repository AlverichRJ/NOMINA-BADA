/**
 * Configuración de PM2 para el servidor de producción.
 *
 * Uso inicial (primera vez):
 *   cd /var/www/asistencias
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *
 * Para reiniciar después de actualizar el código:
 *   pm2 restart asistencias
 *
 * Para ver logs:
 *   pm2 logs asistencias
 */
module.exports = {
  apps: [
    {
      name: "asistencias",
      script: "dist/index.js",
      cwd: "/var/www/asistencias",
      env_production: {
        NODE_ENV: "production",
        PORT: "3000",
        // Base de datos MySQL
        DATABASE_URL: "mysql://asistencias:Badabun2026x@localhost:3306/asistencias",
        // JWT para sesiones
        JWT_SECRET: "5E2jFerbN//h48YIc+2X4RXa+jojrpVcI1s72FE/nEA=",
        // Google OAuth 2.0
        GOOGLE_CLIENT_ID: "928286634598-uca7jd6l2hh5sr2ft2qhmn5o47qgdpq4.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "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",
        // Email del administrador principal
        OWNER_EMAIL: "suarez@badabun.com",
        // URL base del servidor (debe coincidir con el URI registrado en Google Cloud)
        APP_BASE_URL: "http://badabun.ddns.net",
        // Directorio de uploads (logos, etc.)
        UPLOADS_DIR: "/var/www/asistencias/uploads",
      },
      // Usar --env production para cargar env_production
      env: {
        NODE_ENV: "production",
      },
      // Reiniciar automáticamente si el proceso cae
      autorestart: true,
      // Número máximo de reinicios antes de marcar como error
      max_restarts: 10,
      // Tiempo mínimo de vida antes de considerar estable
      min_uptime: "10s",
      // Logs
      out_file: "/home/arj/.pm2/logs/asistencias-out.log",
      error_file: "/home/arj/.pm2/logs/asistencias-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Modo fork (no cluster) para simplicidad
      exec_mode: "fork",
      instances: 1,
    },
  ],
};
