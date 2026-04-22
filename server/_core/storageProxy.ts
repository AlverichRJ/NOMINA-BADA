/**
 * Proxy de almacenamiento — sirve archivos locales del directorio uploads/.
 * Mantiene compatibilidad con URLs antiguas /manus-storage/ redirigiendo a /uploads/.
 * En produccion, Nginx puede servir /uploads/ directamente para mejor rendimiento.
 */
import express, { type Express } from "express";
import * as path from "path";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  const uploadsDir = ENV.uploadsDir || "uploads";
  const absoluteUploadsDir = path.isAbsolute(uploadsDir)
    ? uploadsDir
    : path.resolve(process.cwd(), uploadsDir);

  // Servir archivos estaticos desde /uploads/
  app.use("/uploads", express.static(absoluteUploadsDir, {
    maxAge: "1d",
    etag: true,
  }));

  // Compatibilidad hacia atras: redirigir /manus-storage/* a /uploads/*
  // Esto permite que logos guardados con la URL antigua sigan funcionando
  app.get("/manus-storage/*", (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // Si hay Forge configurado (corriendo en Manus), usar el proxy original
    if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      fetch(forgeUrl.toString(), {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      })
        .then(async (forgeResp) => {
          if (!forgeResp.ok) {
            const body = await forgeResp.text().catch(() => "");
            console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
            res.status(502).send("Storage backend error");
            return;
          }
          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.status(502).send("Empty signed URL from backend");
            return;
          }
          res.set("Cache-Control", "no-store");
          res.redirect(307, url);
        })
        .catch((err) => {
          console.error("[StorageProxy] failed:", err);
          res.status(502).send("Storage proxy error");
        });
      return;
    }

    // Sin Forge: redirigir a /uploads/ (almacenamiento local)
    res.redirect(301, `/uploads/${key}`);
  });
}
