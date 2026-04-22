/**
 * Storage local en disco — reemplaza el storage de Manus S3.
 * Los archivos se guardan en el directorio configurado por UPLOADS_DIR.
 * Se sirven como archivos estáticos en /uploads/.
 */
import * as fs from "fs";
import * as path from "path";
import { ENV } from "./_core/env";

function getUploadsDir(): string {
  const dir = ENV.uploadsDir || "uploads";
  // Si es ruta relativa, resolverla desde el directorio del proceso
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Guarda un archivo en disco y devuelve la URL pública.
 * @param relKey - Clave relativa del archivo (ej: "app-logos/logo.png")
 * @param data - Contenido del archivo
 * @param _contentType - Tipo MIME (no usado en almacenamiento local)
 * @returns { key, url } donde url es la ruta pública /uploads/...
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const uploadsDir = getUploadsDir();

  // Crear subdirectorios si es necesario
  const filePath = path.join(uploadsDir, key);
  const fileDir = path.dirname(filePath);
  ensureDir(fileDir);

  // Escribir archivo
  const buffer = typeof data === "string"
    ? Buffer.from(data, "utf-8")
    : Buffer.from(data as Uint8Array);

  fs.writeFileSync(filePath, buffer);

  return { key, url: `/uploads/${key}` };
}

/**
 * Obtiene la URL pública de un archivo guardado.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/uploads/${key}` };
}

/**
 * Compatibilidad: devuelve la URL directa del archivo (no necesita firma).
 */
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `/uploads/${key}`;
}
