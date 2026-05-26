import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { generarPDF, generarExcel, generarPDFPagosBancos } from "../exportar";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Export routes
  app.get("/api/export/pdf/:periodoId", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const ocultarMontos = user.role === "reportes";
      const periodoId = parseInt(req.params.periodoId);
      const boolParam = (value: any, fallback = true) => value === undefined ? fallback : String(value) === "true";
      const departamentoRaw = req.query.departamentoId;
      const diasRaw = req.query.diasSeleccionados;
      const diasSeleccionados = typeof diasRaw === "string" && diasRaw.trim().length > 0
        ? diasRaw.split(",").map((d) => d.trim()).filter(Boolean)
        : [];
      const buffer = await generarPDF(periodoId, {
        departamentoId: departamentoRaw && departamentoRaw !== "todos" ? parseInt(String(departamentoRaw), 10) : null,
        tipoRegistros: ["todos", "asistencias", "faltas", "descansos"].includes(String(req.query.tipoRegistros)) ? String(req.query.tipoRegistros) as any : "todos",
        includeResumen: boolParam(req.query.includeResumen),
        includeTotalEmpleados: boolParam(req.query.includeTotalEmpleados),
        includePromedioAsistencia: boolParam(req.query.includePromedioAsistencia),
        includeTotalDescuentos: ocultarMontos ? false : boolParam(req.query.includeTotalDescuentos),
        includeTotalNomina: ocultarMontos ? false : boolParam(req.query.includeTotalNomina),
        includeSalario: ocultarMontos ? false : boolParam(req.query.includeSalario),
        includeBonos: ocultarMontos ? false : boolParam(req.query.includeBonos),
        includeDescuento: ocultarMontos ? false : boolParam(req.query.includeDescuento),
        includeSalarioPagar: ocultarMontos ? false : boolParam(req.query.includeSalarioPagar),
        includeAsistidos: boolParam(req.query.includeAsistidos),
        includeFaltas: boolParam(req.query.includeFaltas),
        includeTablaDias: boolParam(req.query.includeTablaDias),
        includeEntrada: boolParam(req.query.includeEntrada),
        includeSalidaComida: boolParam(req.query.includeSalidaComida),
        includeEntradaComida: boolParam(req.query.includeEntradaComida),
        includeSalida: boolParam(req.query.includeSalida),
        includeColumnaFaltas: boolParam(req.query.includeColumnaFaltas),
        diasSeleccionados,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Reporte_${periodoId}.pdf"`);
      res.send(buffer);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/export/pdf-pagos-bancos/:periodoId", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (user.role === "reportes") {
        return res.status(403).json({ error: "Este perfil solo puede consultar reportes en pantalla, sin exportar cantidades." });
      }
      const periodoId = parseInt(req.params.periodoId);
      const departamentoId = req.query.departamentoId ? parseInt(String(req.query.departamentoId), 10) : null;
      const banco = req.query.banco ? String(req.query.banco) : null;
      const buffer = await generarPDFPagosBancos(periodoId, { departamentoId, banco });
      if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
        throw new Error("No se pudo generar un PDF válido de pagos a bancos.");
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Pagos_Bancos_${periodoId}.pdf"`);
      res.setHeader("Content-Length", String(buffer.length));
      res.setHeader("Cache-Control", "no-store");
      res.end(buffer);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/export/xlsx/:periodoId", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (user.role === "reportes") {
        return res.status(403).json({ error: "Este perfil solo puede consultar reportes en pantalla, sin exportar cantidades." });
      }
      const periodoId = parseInt(req.params.periodoId);
      const buffer = await generarExcel(periodoId);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="Reporte_${periodoId}.xlsx"`);
      res.send(buffer);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
