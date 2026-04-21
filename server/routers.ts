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

        // Crear período
        const nombrePeriodo = `${fechaInicio} al ${fechaFin}`;
        await crearPeriodo({
          nombre: nombrePeriodo,
          fechaInicio,
          fechaFin,
          archivoNombre: input.nombreArchivo,
        });

        // Obtener el período recién creado
        const periodosDB = await getPeriodos();
        const periodoActual = periodosDB[0];
        if (!periodoActual) throw new Error("Error al crear período");

        const periodoId = periodoActual.id;

        // Limpiar datos previos del período
        await eliminarAsistenciasPeriodo(periodoId);
        await eliminarCalculosPeriodo(periodoId);

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

        return {
          periodoId,
          nombrePeriodo,
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
});

export type AppRouter = typeof appRouter;
