import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  asistencias,
  calculosNomina,
  empleados,
  periodos,
  users,
  appConfig,
  type Empleado,
  type InsertAsistencia,
  type InsertCalculoNomina,
  type InsertEmpleado,
  type InsertPeriodo,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── EMPLEADOS ────────────────────────────────────────────────────────────────

export async function getEmpleados(periodoId?: number) {
  const db = await getDb();
  if (!db) return [];
  // Incluir dias_falta del período especificado (o el último si no se especifica)
  const mysql2 = await import("mysql2/promise");
  const rawConn = await mysql2.createConnection(process.env.DATABASE_URL!);
  const periodoCondicion = periodoId
    ? `cn.periodo_id = ${periodoId}`
    : `cn.periodo_id = (SELECT MAX(id) FROM periodos)`;
  const [rows] = await rawConn.execute(`
    SELECT
      e.id,
      e.nombre,
      e.salario_mensual  AS salarioMensual,
      e.bonos,
      e.dias_laborados   AS diasLaborados,
      e.descuentos_adicionales AS descuentosAdicionales,
      e.activo,
      e.createdAt,
      e.updatedAt,
      COALESCE((
        SELECT cn.dias_falta
        FROM calculos_nomina cn
        WHERE cn.empleado_id = e.id
          AND ${periodoCondicion}
        LIMIT 1
      ), 0) as dias_falta_periodo
    FROM empleados e
    WHERE e.activo = 1
    ORDER BY e.nombre
  `) as any;
  await rawConn.end();
  return rows as (typeof empleados.$inferSelect & { dias_falta_periodo?: number })[];
}

export async function getEmpleadoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(empleados).where(eq(empleados.id, id)).limit(1);
  return result[0];
}

export async function getEmpleadoByNombre(nombre: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(empleados).where(eq(empleados.nombre, nombre)).limit(1);
  return result[0];
}

export async function crearEmpleado(data: InsertEmpleado) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  const result = await db.insert(empleados).values(data);
  return result;
}

export async function actualizarEmpleado(id: number, data: Partial<InsertEmpleado>) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.update(empleados).set(data).where(eq(empleados.id, id));
}

export async function eliminarEmpleado(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.update(empleados).set({ activo: false }).where(eq(empleados.id, id));
}

// ─── PERIODOS ─────────────────────────────────────────────────────────────────

export async function getPeriodos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(periodos).orderBy(desc(periodos.createdAt));
}

export async function getPeriodoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(periodos).where(eq(periodos.id, id)).limit(1);
  return result[0];
}

export async function crearPeriodo(data: InsertPeriodo) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  const result = await db.insert(periodos).values(data);
  return result;
}

export async function deletePeriodo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.delete(periodos).where(eq(periodos.id, id));
}

export async function renamePeriodo(id: number, nombre: string) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.update(periodos).set({ nombre }).where(eq(periodos.id, id));
}

// ─── ASISTENCIAS ──────────────────────────────────────────────────────────────

export async function getAsistenciasByPeriodo(periodoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(asistencias)
    .where(eq(asistencias.periodoId, periodoId))
    .orderBy(asistencias.empleadoId, asistencias.fecha);
}

export async function getAsistenciasByEmpleadoPeriodo(empleadoId: number, periodoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(asistencias)
    .where(and(eq(asistencias.empleadoId, empleadoId), eq(asistencias.periodoId, periodoId)))
    .orderBy(asistencias.fecha);
}

export async function insertarAsistencias(data: InsertAsistencia[]) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  if (data.length === 0) return;
  // Insertar en lotes de 100
  for (let i = 0; i < data.length; i += 100) {
    await db.insert(asistencias).values(data.slice(i, i + 100));
  }
}

export async function eliminarAsistenciasPeriodo(periodoId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.delete(asistencias).where(eq(asistencias.periodoId, periodoId));
}

// ─── CÁLCULOS NÓMINA ──────────────────────────────────────────────────────────

export async function getCalculosByPeriodo(periodoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(calculosNomina)
    .where(eq(calculosNomina.periodoId, periodoId))
    .orderBy(calculosNomina.empleadoId);
}

export async function upsertCalculoNomina(data: InsertCalculoNomina) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.insert(calculosNomina).values(data).onDuplicateKeyUpdate({
    set: {
      diasLaborables: data.diasLaborables,
      diasAsistidos: data.diasAsistidos,
      diasFalta: data.diasFalta,
      descuento: data.descuento,
      salarioAPagar: data.salarioAPagar,
    },
  });
}

export async function eliminarCalculosPeriodo(periodoId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.delete(calculosNomina).where(eq(calculosNomina.periodoId, periodoId));
}

export async function getAppConfig() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appConfig);
}

export async function setAppConfig(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.insert(appConfig).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}
