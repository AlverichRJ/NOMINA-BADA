import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getEmpleados,
  getEmpleadoById,
  crearEmpleado,
  actualizarEmpleado,
  eliminarEmpleado,
  getPeriodos,
  getPeriodoById,
  crearPeriodo,
  deletePeriodo,
  renamePeriodo,
  getAsistenciasByPeriodo,
  getAsistenciasByEmpleadoPeriodo,
  insertarAsistencias,
  eliminarAsistenciasPeriodo,
  getCalculosByPeriodo,
  upsertCalculoNomina,
  eliminarCalculosPeriodo,
  getEmpleadoByNombre,
} from "./db";
import { parsearArchivo, calcularDescuento, calcularSalarioAPagar, esDomingo } from "./parser";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── EMPLEADOS ─────────────────────────────────────────────────────────────
  empleados: router({
    list: publicProcedure.query(async () => {
      return getEmpleados();
    }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return getEmpleadoById(input.id);
    }),

    create: publicProcedure
      .input(
        z.object({
          nombre: z.string().min(1),
          salarioMensual: z.number().min(0),
          bonos: z.number().min(0).default(0),
        })
      )
      .mutation(async ({ input }) => {
        await crearEmpleado({
          nombre: input.nombre,
          salarioMensual: input.salarioMensual.toFixed(2),
          bonos: input.bonos.toFixed(2),
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          nombre: z.string().min(1).optional(),
          salarioMensual: z.number().min(0).optional(),
          bonos: z.number().min(0).optional(),
          diasLaborados: z.number().min(0).optional(),
          descuentosAdicionales: z.number().min(0).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};
        if (data.nombre !== undefined) updateData.nombre = data.nombre;
        if (data.salarioMensual !== undefined) updateData.salarioMensual = data.salarioMensual.toFixed(2);
        if (data.bonos !== undefined) updateData.bonos = data.bonos.toFixed(2);
        if (data.diasLaborados !== undefined) updateData.diasLaborados = data.diasLaborados;
        if (data.descuentosAdicionales !== undefined) updateData.descuentosAdicionales = data.descuentosAdicionales.toFixed(2);
        await actualizarEmpleado(id, updateData as any);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await eliminarEmpleado(input.id);
        return { success: true };
      }),
  }),

  // ─── PERIODOS ──────────────────────────────────────────────────────────────
  periodos: router({
    list: publicProcedure.query(async () => {
      return getPeriodos();
    }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return getPeriodoById(input.id);
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Eliminar datos relacionados primero
        await eliminarAsistenciasPeriodo(input.id);
        await eliminarCalculosPeriodo(input.id);
        await deletePeriodo(input.id);
        return { success: true };
      }),

    rename: protectedProcedure
      .input(z.object({ id: z.number(), nombre: z.string().min(1) }))
      .mutation(async ({ input }) => {
        await renamePeriodo(input.id, input.nombre);
        return { success: true };
      }),
  }),

  // ─── REPORTES ──────────────────────────────────────────────────────────────
  reportes: router({
    procesarArchivo: publicProcedure
      .input(
        z.object({
          contenido: z.string(),
          nombreArchivo: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { empleados: empleadosParsed, fechaInicio, fechaFin } = parsearArchivo(input.contenido);

        if (!fechaInicio || !fechaFin) {
          throw new Error("No se pudo determinar el rango de fechas del archivo");
        }

        // Verificar si ya existe un período con el mismo nombre o archivo para evitar duplicados
        const periodosExistentes = await getPeriodos();
        const periodoExistente = periodosExistentes.find(
          (p) => p.nombre === `${fechaInicio} al ${fechaFin}` || p.archivoNombre === input.nombreArchivo
        );

        let periodoId: number;
        if (periodoExistente) {
          // Reusar el período existente y limpiar sus datos
          periodoId = periodoExistente.id;
          await eliminarAsistenciasPeriodo(periodoId);
          await eliminarCalculosPeriodo(periodoId);
        } else {
          // Crear período nuevo
          const nombrePeriodo = `${fechaInicio} al ${fechaFin}`;
          await crearPeriodo({
            nombre: nombrePeriodo,
            fechaInicio,
            fechaFin,
            archivoNombre: input.nombreArchivo,
          });
          const periodosDB = await getPeriodos();
          const periodoActual = periodosDB[0];
          if (!periodoActual) throw new Error("Error al crear período");
          periodoId = periodoActual.id;
        }

        // Obtener todos los empleados de la DB
        const empleadosDB = await getEmpleados();
        const empleadosMap = new Map(empleadosDB.map((e) => [e.nombre.toLowerCase().trim(), e]));

        // Helper: normalizar nombre (sin acentos, minúsculas)
        function normalizarNombre(s: string) {
          return s.toLowerCase().trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ");
        }

        // Helper: similitud por palabras en común (>= 3 chars)
        function similitudNombre(a: string, b: string): number {
          const palabrasA = new Set(normalizarNombre(a).split(" ").filter((p: string) => p.length >= 3));
          const palabrasB = new Set(normalizarNombre(b).split(" ").filter((p: string) => p.length >= 3));
          let comunes = 0;
          Array.from(palabrasA).forEach((p: string) => { if (palabrasB.has(p)) comunes++; });
          return comunes;
        }

        const resultados = [];

        for (const empParsed of empleadosParsed) {
          // 1. Buscar por nombre exacto
          let empleadoDB = empleadosMap.get(empParsed.nombre.toLowerCase().trim());

          // 2. Si no existe, buscar por similitud de palabras (match inteligente)
          if (!empleadoDB) {
            let mejorScore = 0;
            let mejorMatch = null;
            for (const emp of empleadosDB) {
              const score = similitudNombre(empParsed.nombre, emp.nombre);
              if (score > mejorScore) { mejorScore = score; mejorMatch = emp; }
            }
            if (mejorMatch && mejorScore >= 2) {
              empleadoDB = mejorMatch;
            }
          }

          // 3. Solo crear nuevo empleado si realmente no hay match
          if (!empleadoDB) {
            await crearEmpleado({
              nombre: empParsed.nombre,
              salarioMensual: "0",
              bonos: "0",
            });
            const empCreado = await getEmpleadoByNombre(empParsed.nombre);
            if (!empCreado) continue;
            empleadoDB = empCreado;
          }

          if (!empleadoDB) continue;
          const empleadoId = empleadoDB.id;
          const salario = parseFloat(empleadoDB.salarioMensual as string) || 0;
          const bonos = parseFloat(empleadoDB.bonos as string) || 0;

          // Insertar asistencias
          const asistenciasData = empParsed.registros.map((r) => ({
            empleadoId,
            periodoId,
            fecha: r.fecha,
            entrada: r.entrada,
            salida: r.salida,
            esFalta: r.esFalta,
            esDescanso: r.esDescanso,
          }));

          await insertarAsistencias(asistenciasData);

          // Calcular días laborables (sin domingos ni descansos)
          const diasLaborables = empParsed.registros.filter(
            (r) => !r.esDescanso && !esDomingo(r.fecha)
          ).length;

          const diasFalta = empParsed.registros.filter((r) => r.esFalta).length;
          const diasAsistidos = diasLaborables - diasFalta;
          const descuento = calcularDescuento(salario, diasFalta);
          const salarioAPagar = calcularSalarioAPagar(salario, diasLaborables, bonos, descuento);

          await upsertCalculoNomina({
            empleadoId,
            periodoId,
            diasLaborables,
            diasAsistidos: Math.max(0, diasAsistidos),
            diasFalta,
            descuento: descuento.toFixed(2),
            salarioAPagar: Math.max(0, salarioAPagar).toFixed(2),
          });

          // Sincronizar días laborados (asistidos) al registro del empleado
          await actualizarEmpleado(empleadoId, { diasLaborados: Math.max(0, diasAsistidos) } as any);

          resultados.push({
            nombre: empParsed.nombre,
            diasLaborables,
            diasAsistidos: Math.max(0, diasAsistidos),
            diasFalta,
            descuento,
            salarioAPagar: Math.max(0, salarioAPagar),
          });
        }

        const periodoFinal = periodoExistente ?? (await getPeriodos())[0];
        return {
          periodoId,
          nombrePeriodo: periodoFinal?.nombre ?? `${fechaInicio} al ${fechaFin}`,
          totalEmpleados: resultados.length,
          resultados,
        };
      }),

    getReportePeriodo: publicProcedure
      .input(z.object({ periodoId: z.number() }))
      .query(async ({ input }) => {
        const periodo = await getPeriodoById(input.periodoId);
        if (!periodo) throw new Error("Período no encontrado");

        const asistenciasDB = await getAsistenciasByPeriodo(input.periodoId);
        const calculosDB = await getCalculosByPeriodo(input.periodoId);
        const empleadosDB = await getEmpleados();
        const todosEmpleados = await (async () => {
          const { getDb } = await import("./db");
          const db = await getDb();
          if (!db) return [];
          const { empleados: emp } = await import("../drizzle/schema");
          return db.select().from(emp);
        })();

        const empleadosMap = new Map(todosEmpleados.map((e) => [e.id, e]));

        // Agrupar asistencias por empleado
        const asistenciasPorEmpleado = new Map<number, typeof asistenciasDB>();
        for (const a of asistenciasDB) {
          if (!asistenciasPorEmpleado.has(a.empleadoId)) {
            asistenciasPorEmpleado.set(a.empleadoId, []);
          }
          asistenciasPorEmpleado.get(a.empleadoId)!.push(a);
        }

        const calculos = calculosDB.map((c) => {
          const emp = empleadosMap.get(c.empleadoId);
          return {
            ...c,
            empleadoNombre: emp?.nombre || "Desconocido",
            salarioMensual: parseFloat(emp?.salarioMensual as string || "0"),
            bonos: parseFloat(emp?.bonos as string || "0"),
            asistencias: (asistenciasPorEmpleado.get(c.empleadoId) || []).sort(
              (a, b) => a.fecha.localeCompare(b.fecha)
            ),
          };
        });

        return {
          periodo,
          calculos,
          totalEmpleados: calculos.length,
          promedioAsistencia:
            calculos.length > 0
              ? calculos.reduce(
                  (sum, c) =>
                    sum +
                    (c.diasLaborables > 0 ? (c.diasAsistidos / c.diasLaborables) * 100 : 0),
                  0
                ) / calculos.length
              : 0,
          empleadosCriticos: calculos
            .filter((c) => c.diasFalta >= 3)
            .sort((a, b) => b.diasFalta - a.diasFalta),
        };
      }),

    getAsistenciasEmpleado: publicProcedure
      .input(z.object({ empleadoId: z.number(), periodoId: z.number() }))
      .query(async ({ input }) => {
        return getAsistenciasByEmpleadoPeriodo(input.empleadoId, input.periodoId);
      }),
  }),

  // ─── IMPORTACIÓN DE SALARIOS ──────────────────────────────────────────────────────────────────────
  salarios: router({
    // Previsualizar los datos del archivo antes de importar
    preview: publicProcedure
      .input(z.object({ contenido: z.string(), formato: z.enum(["csv", "xlsx_base64"]) }))
      .mutation(async ({ input }) => {
        const filas = parsearArchivoSalarios(input.contenido, input.formato);
        return { filas, total: filas.length };
      }),

    // Confirmar e importar los salarios a la BD
    importar: publicProcedure
      .input(
        z.object({
          filas: z.array(
            z.object({
              nombre: z.string(),
              salarioMensual: z.number(),
              bonos: z.number().optional().default(0),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const empleadosDB = await getEmpleados();

        function normNombre(s: string) {
          return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
        }
        function similitud(a: string, b: string): number {
          const pa = new Set(normNombre(a).split(" ").filter((p: string) => p.length >= 3));
          const pb = new Set(normNombre(b).split(" ").filter((p: string) => p.length >= 3));
          let c = 0;
          Array.from(pa).forEach((p: string) => { if (pb.has(p)) c++; });
          return c;
        }

        const resultados = [];
        for (const fila of input.filas) {
          // Buscar empleado existente por nombre exacto o similitud
          let emp = empleadosDB.find((e) => normNombre(e.nombre) === normNombre(fila.nombre));
          if (!emp) {
            let mejorScore = 0, mejorMatch = null;
            for (const e of empleadosDB) {
              const s = similitud(fila.nombre, e.nombre);
              if (s > mejorScore) { mejorScore = s; mejorMatch = e; }
            }
            if (mejorMatch && mejorScore >= 2) emp = mejorMatch;
          }

          if (emp) {
            // Actualizar salario del empleado existente
            await actualizarEmpleado(emp.id, {
              salarioMensual: fila.salarioMensual.toFixed(2),
              bonos: (fila.bonos ?? 0).toFixed(2),
            } as any);
            resultados.push({ nombre: fila.nombre, accion: "actualizado", empleadoId: emp.id });
          } else {
            // Crear nuevo empleado
            await crearEmpleado({
              nombre: fila.nombre,
              salarioMensual: fila.salarioMensual.toFixed(2),
              bonos: (fila.bonos ?? 0).toFixed(2),
            });
            resultados.push({ nombre: fila.nombre, accion: "creado", empleadoId: null });
          }
        }
        return { total: resultados.length, resultados };
      }),
  }),

  // ─── CONFIGURACIÓN DE LA APP ────────────────────────────────────────────────────────────
  config: router({
    get: publicProcedure.query(async () => {
      const db = await import("./db");
      const rows = await db.getAppConfig();
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.value ?? "";
      }
      return result;
    }),
    set: protectedProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        const db = await import("./db");
        await db.setAppConfig(input.key, input.value);
        return { success: true };
      }),
    uploadLogo: protectedProcedure
      .input(z.object({
        // base64 data URL: "data:image/png;base64,..."
        dataUrl: z.string().min(1),
        mimeType: z.string().default("image/png"),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const db = await import("./db");

        // Extraer los bytes del data URL base64
        const matches = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) throw new Error("Formato de imagen inválido");
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        // Determinar extensión
        const ext = mimeType.includes("png") ? "png" : mimeType.includes("gif") ? "gif" : mimeType.includes("webp") ? "webp" : "jpg";
        const key = `app-logos/logo.${ext}`;

        // Subir a S3
        const { url } = await storagePut(key, buffer, mimeType);

        // Guardar URL en app_config
        await db.setAppConfig("app_logo", url);
        return { success: true, url };
      }),
  }),
});

// ─── PARSER DE ARCHIVO DE SALARIOS ──────────────────────────────────────────────────────────────────────
function parsearArchivoSalarios(contenido: string, formato: "csv" | "xlsx_base64"): Array<{ nombre: string; salarioMensual: number; bonos: number }> {
  if (formato === "csv") {
    const lineas = contenido.split(/\r?\n/).filter((l) => l.trim());
    const filas = [];
    for (const linea of lineas.slice(1)) { // saltar encabezado
      const cols = linea.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length < 2) continue;
      const nombre = cols[0];
      const salario = parseFloat(cols[1].replace(/[$,\s]/g, ""));
      const bonos = cols[2] ? parseFloat(cols[2].replace(/[$,\s]/g, "")) || 0 : 0;
      if (nombre && !isNaN(salario) && salario > 0) {
        filas.push({ nombre, salarioMensual: salario, bonos });
      }
    }
    return filas;
  } else {
    // xlsx_base64
    const XLSX = require("xlsx");
    const buf = Buffer.from(contenido, "base64");
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const filas = [];
    for (const row of rows.slice(1)) { // saltar encabezado
      const nombre = String(row[0] || "").trim();
      const salario = parseFloat(String(row[1] || "").replace(/[$,\s]/g, ""));
      const bonos = row[2] ? parseFloat(String(row[2]).replace(/[$,\s]/g, "")) || 0 : 0;
      if (nombre && !isNaN(salario) && salario > 0) {
        filas.push({ nombre, salarioMensual: salario, bonos });
      }
    }
    return filas;
  }
}

export type AppRouter = typeof appRouter;
