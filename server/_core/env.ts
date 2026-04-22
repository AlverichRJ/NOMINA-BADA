export const ENV = {
  // Autenticación JWT
  cookieSecret: process.env.JWT_SECRET ?? "",

  // Base de datos
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Google OAuth 2.0
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  // Email del dueño del sistema (se auto-promueve a admin en el primer login)
  ownerEmail: process.env.OWNER_EMAIL ?? "",

  // URL base del servidor (ej: http://192.168.10.73 o https://sistemabadabun.com)
  // Si no se configura, el callback de Google OAuth usará ruta relativa
  appBaseUrl: process.env.APP_BASE_URL ?? "",

  // Directorio para subir archivos (logos, etc.)
  uploadsDir: process.env.UPLOADS_DIR ?? "uploads",

  // Entorno
  isProduction: process.env.NODE_ENV === "production",

  // Compatibilidad hacia atrás — se mantiene para no romper db.ts
  // (ownerOpenId se usaba para auto-promover al dueño; ahora se usa ownerEmail)
  ownerOpenId: process.env.OWNER_OPEN_ID ?? process.env.OWNER_EMAIL ?? "",

  // Variables de Manus (opcionales, para compatibilidad con Manus hosting)
  appId: process.env.VITE_APP_ID ?? "local",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
