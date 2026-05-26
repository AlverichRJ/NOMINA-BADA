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
  departamentos,
  ajustesNominaPeriodo,
  type InsertAsistencia,
  type InsertCalculoNomina,
  type InsertDepartamento,
  type InsertEmpleado,
  type InsertPeriodo,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { CATALOGO_NOMINA_EMPLEADOS } from "./catalogoNomina";

let _db: ReturnType<typeof drizzle> | null = null;
let schemaReady = false;

const DEPARTAMENTOS_INICIALES = [
  "Edicion",
  "Social Media",
  "Produccion",
  "Diseño",
  "Mantenimiento",
  "Administracion",
];

async function getRawConnection() {
  const mysql2 = await import("mysql2/promise");
  return mysql2.createConnection(process.env.DATABASE_URL!);
}

async function columnExists(rawConn: Awaited<ReturnType<typeof getRawConnection>>, table: string, column: string) {
  const [rows] = await rawConn.execute(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  ) as any;
  return Number(rows?.[0]?.total ?? 0) > 0;
}

function normalizarClaveEmpleado(nombre: string) {
  return String(nombre ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensEmpleado(nombre: string) {
  return normalizarClaveEmpleado(nombre)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function esMismoEmpleadoProbable(nombreA: string, nombreB: string) {
  const claveA = normalizarClaveEmpleado(nombreA);
  const claveB = normalizarClaveEmpleado(nombreB);
  if (!claveA || !claveB) return false;
  if (claveA === claveB) return true;

  const tokensA = Array.from(new Set(tokensEmpleado(nombreA)));
  const tokensB = Array.from(new Set(tokensEmpleado(nombreB)));
  if (tokensA.length < 2 || tokensB.length < 2) return false;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const comunes = tokensA.filter((token) => setB.has(token)).length;
  const menor = Math.min(tokensA.length, tokensB.length);

  // Permite fusionar nombres invertidos o incompletos del TXT, por ejemplo:
  // "Aceves Guillermo" -> "Guillermo Guzman Aceves".
  return comunes >= 2 && comunes === menor;
}

async function fusionarEmpleadoDuplicado(
  rawConn: Awaited<ReturnType<typeof getRawConnection>>,
  conservarId: number,
  duplicadoId: number,
) {
  if (!conservarId || !duplicadoId || conservarId === duplicadoId) return;

  await rawConn.execute(
    `UPDATE asistencias SET empleado_id = ? WHERE empleado_id = ?`,
    [conservarId, duplicadoId],
  );

  await rawConn.execute(
    `DELETE a1 FROM asistencias a1
     INNER JOIN asistencias a2
       ON a2.empleado_id = a1.empleado_id
      AND a2.periodo_id = a1.periodo_id
      AND a2.fecha = a1.fecha
      AND a2.id < a1.id
     WHERE a1.empleado_id = ?`,
    [conservarId],
  );

  await rawConn.execute(
    `UPDATE calculos_nomina cn
     LEFT JOIN calculos_nomina existente
       ON existente.empleado_id = ?
      AND existente.periodo_id = cn.periodo_id
      AND existente.id <> cn.id
     SET cn.empleado_id = CASE WHEN existente.id IS NULL THEN ? ELSE cn.empleado_id END
     WHERE cn.empleado_id = ?`,
    [conservarId, conservarId, duplicadoId],
  );

  await rawConn.execute(
    `DELETE cn FROM calculos_nomina cn
     INNER JOIN calculos_nomina conservar
       ON conservar.empleado_id = ?
      AND conservar.periodo_id = cn.periodo_id
      AND conservar.id <> cn.id
     WHERE cn.empleado_id = ?`,
    [conservarId, duplicadoId],
  );

  await rawConn.execute(
    `UPDATE empleados SET activo = false, nombre = CONCAT(nombre, ' (duplicado fusionado)') WHERE id = ?`,
    [duplicadoId],
  );
}

async function deduplicarEmpleadosPorNombre(rawConn: Awaited<ReturnType<typeof getRawConnection>>) {
  const [rows] = await rawConn.execute(
    `SELECT id, nombre, banco, numero_cuenta, tarjeta, clabe_interbancaria FROM empleados WHERE activo = true ORDER BY id ASC`,
  ) as any;
  const empleadosLista = (rows ?? []) as Array<{ id: number; nombre: string; banco?: string | null; numero_cuenta?: string | null; tarjeta?: string | null; clabe_interbancaria?: string | null }>;
  const fusionados = new Set<number>();

  for (let i = 0; i < empleadosLista.length; i++) {
    const principal = empleadosLista[i];
    if (fusionados.has(principal.id)) continue;

    for (let j = i + 1; j < empleadosLista.length; j++) {
      const candidato = empleadosLista[j];
      if (fusionados.has(candidato.id)) continue;
      if (!esMismoEmpleadoProbable(principal.nombre, candidato.nombre)) continue;

      const conservar = principal.id < candidato.id ? principal : candidato;
      const duplicado = principal.id < candidato.id ? candidato : principal;
      await fusionarEmpleadoDuplicado(rawConn, conservar.id, duplicado.id);
      fusionados.add(duplicado.id);
    }
  }
}

async function ensureAppSchema() {
  if (schemaReady || !process.env.DATABASE_URL) return;
  const rawConn = await getRawConnection();
  try {
    await rawConn.execute(`ALTER TABLE users MODIFY role ENUM('user','admin','reportes') NOT NULL DEFAULT 'user'`);

    await rawConn.execute(`
      CREATE TABLE IF NOT EXISTS departamentos (
        id int AUTO_INCREMENT NOT NULL,
        nombre varchar(120) NOT NULL,
        activo boolean NOT NULL DEFAULT true,
        createdAt timestamp NOT NULL DEFAULT (now()),
        updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT departamentos_id PRIMARY KEY(id),
        CONSTRAINT departamentos_nombre_unique UNIQUE(nombre)
      )
    `);

    if (!(await columnExists(rawConn, "empleados", "departamento_id"))) {
      await rawConn.execute(`ALTER TABLE empleados ADD departamento_id int NULL`);
    }

    if (!(await columnExists(rawConn, "empleados", "notas"))) {
      await rawConn.execute(`ALTER TABLE empleados ADD notas text NULL AFTER departamento_id`);
    }

    if (!(await columnExists(rawConn, "empleados", "banco"))) {
      await rawConn.execute(`ALTER TABLE empleados ADD banco varchar(120) NULL AFTER notas`);
    }

    if (!(await columnExists(rawConn, "empleados", "numero_cuenta"))) {
      await rawConn.execute(`ALTER TABLE empleados ADD numero_cuenta varchar(80) NULL AFTER banco`);
    }

    if (!(await columnExists(rawConn, "empleados", "tarjeta"))) {
      await rawConn.execute(`ALTER TABLE empleados ADD tarjeta varchar(80) NULL AFTER numero_cuenta`);
    }

    if (!(await columnExists(rawConn, "empleados", "clabe_interbancaria"))) {
      await rawConn.execute(`ALTER TABLE empleados ADD clabe_interbancaria varchar(80) NULL AFTER tarjeta`);
    }

    if (!(await columnExists(rawConn, "empleados", "dias_laborados_manual"))) {
      await rawConn.execute(`ALTER TABLE empleados ADD dias_laborados_manual boolean NOT NULL DEFAULT false AFTER dias_laborados`);
    }

    if (!(await columnExists(rawConn, "empleados", "nomina_lista"))) {
      await rawConn.execute(`ALTER TABLE empleados ADD nomina_lista boolean NOT NULL DEFAULT false AFTER descuentos_adicionales`);
    }

    if (!(await columnExists(rawConn, "periodos", "dias_seleccionados"))) {
      await rawConn.execute(`ALTER TABLE periodos ADD dias_seleccionados json NULL`);
    }

    if (!(await columnExists(rawConn, "asistencias", "salida_comida"))) {
      await rawConn.execute(`ALTER TABLE asistencias ADD salida_comida varchar(20) NULL AFTER entrada`);
    }

    if (!(await columnExists(rawConn, "asistencias", "entrada_comida"))) {
      await rawConn.execute(`ALTER TABLE asistencias ADD entrada_comida varchar(20) NULL AFTER salida_comida`);
    }

    await rawConn.execute(`
      CREATE TABLE IF NOT EXISTS ajustes_nomina_periodo (
        id int AUTO_INCREMENT NOT NULL,
        empleado_id int NOT NULL,
        periodo_id int NOT NULL,
        bonos decimal(12,2) NULL,
        dias_laborados int NULL,
        dias_laborados_manual boolean NOT NULL DEFAULT false,
        descuentos_adicionales decimal(12,2) NULL,
        nomina_lista boolean NULL,
        createdAt timestamp NOT NULL DEFAULT (now()),
        updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT ajustes_nomina_periodo_id PRIMARY KEY(id),
        CONSTRAINT ajustes_nomina_periodo_empleado_periodo_unique UNIQUE(empleado_id, periodo_id)
      )
    `);

    for (const nombre of DEPARTAMENTOS_INICIALES) {
      await rawConn.execute(
        `INSERT INTO departamentos (nombre, activo) VALUES (?, true)
         ON DUPLICATE KEY UPDATE activo = true`,
        [nombre],
      );
    }

    await deduplicarEmpleadosPorNombre(rawConn);

    for (const emp of CATALOGO_NOMINA_EMPLEADOS) {
      const banco = emp.banco ? String(emp.banco).trim().toUpperCase() : null;
      const valores = [
        emp.nombre,
        Number(emp.salarioMensual || 0).toFixed(2),
        Number(emp.bonos || 0).toFixed(2),
        banco,
        emp.numeroCuenta ? String(emp.numeroCuenta) : null,
        emp.tarjeta ? String(emp.tarjeta) : null,
        emp.clabeInterbancaria ? String(emp.clabeInterbancaria) : null,
      ];

      const [empleadosExistentesActuales] = await rawConn.execute(
        `SELECT id, nombre FROM empleados WHERE activo = true ORDER BY id ASC`,
      ) as any;
      const existente = ((empleadosExistentesActuales ?? []) as Array<{ id: number; nombre: string }>).find((actual) =>
        esMismoEmpleadoProbable(actual.nombre, emp.nombre),
      );

      if (existente) {
        const valoresSinBono = [valores[0], valores[1], valores[3], valores[4], valores[5], valores[6]];
        await rawConn.execute(
          `UPDATE empleados
           SET nombre = ?, salario_mensual = ?, banco = ?, numero_cuenta = ?, tarjeta = ?, clabe_interbancaria = ?, activo = true
           WHERE id = ?`,
          [...valoresSinBono, existente.id],
        );
      } else {
        await rawConn.execute(
          `INSERT INTO empleados (nombre, salario_mensual, bonos, banco, numero_cuenta, tarjeta, clabe_interbancaria, activo)
           VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
          valores,
        );
      }

      await deduplicarEmpleadosPorNombre(rawConn);
    }

    await deduplicarEmpleadosPorNombre(rawConn);

    schemaReady = true;
  } finally {
    await rawConn.end();
  }
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  if (_db) await ensureAppSchema();
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
  } else {
    const isOwnerByEmail = ENV.ownerEmail && user.email === ENV.ownerEmail;
    const isOwnerByOpenId = ENV.ownerOpenId && user.openId === ENV.ownerOpenId;
    if (isOwnerByEmail || isOwnerByOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
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

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    loginMethod: users.loginMethod,
    lastSignedIn: users.lastSignedIn,
    createdAt: users.createdAt,
  }).from(users).orderBy(users.createdAt);
}

export async function updateUserRole(id: number, role: "user" | "admin" | "reportes") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, id));
}

// ─── DEPARTAMENTOS ────────────────────────────────────────────────────────────

export async function getDepartamentos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departamentos).where(eq(departamentos.activo, true)).orderBy(departamentos.nombre);
}

export async function crearDepartamento(data: InsertDepartamento) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.insert(departamentos).values(data);
}

export async function actualizarDepartamento(id: number, nombre: string) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.update(departamentos).set({ nombre }).where(eq(departamentos.id, id));
}

export async function eliminarDepartamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  await db.update(empleados).set({ departamentoId: null } as any).where(eq(empleados.departamentoId, id));
  return db.update(departamentos).set({ activo: false }).where(eq(departamentos.id, id));
}

// ─── EMPLEADOS ────────────────────────────────────────────────────────────────

function buildSelectedDaysCondition(alias = "a", selectedDays?: string[] | null) {
  if (!selectedDays || selectedDays.length === 0) return { sql: "", params: [] as string[] };
  return {
    sql: ` AND ${alias}.fecha IN (${selectedDays.map(() => "?").join(",")})`,
    params: selectedDays,
  };
}

export async function getPeriodoDiasSeleccionados(periodoId: number): Promise<string[] | null> {
  const periodo = await getPeriodoById(periodoId);
  const value = (periodo as any)?.diasSeleccionados ?? (periodo as any)?.dias_seleccionados ?? null;
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getEmpleados(periodoId?: number, incluirInactivos = false) {
  const db = await getDb();
  if (!db) return [];
  const rawConn = await getRawConnection();
  const selectedDays = periodoId ? await getPeriodoDiasSeleccionados(periodoId) : null;
  const selected = buildSelectedDaysCondition("a", selectedDays);
  const periodoJoin = periodoId ? "AND a.periodo_id = ?" : "AND a.periodo_id = (SELECT MAX(id) FROM periodos)";
  const periodoParams = periodoId ? [periodoId] : [];
  const ajustePeriodoJoin = periodoId ? "AND anp.periodo_id = ?" : "AND anp.periodo_id = (SELECT MAX(id) FROM periodos)";
  const ajustePeriodoParams = periodoId ? [periodoId] : [];

  const [rows] = await rawConn.execute(`
    SELECT
      e.id,
      e.nombre,
      e.departamento_id AS departamentoId,
      d.nombre AS departamentoNombre,
      e.notas,
      e.banco,
      e.numero_cuenta AS numeroCuenta,
      e.tarjeta,
      e.clabe_interbancaria AS clabeInterbancaria,
      e.salario_mensual AS salarioMensual,
      COALESCE(anp.bonos, e.bonos) AS bonos,
      COALESCE(anp.dias_laborados, e.dias_laborados) AS diasLaborados,
      COALESCE(anp.dias_laborados_manual, e.dias_laborados_manual) AS diasLaboradosManual,
      COALESCE(anp.descuentos_adicionales, e.descuentos_adicionales) AS descuentosAdicionales,
      COALESCE(anp.nomina_lista, e.nomina_lista) AS nominaLista,
      e.activo,
      e.createdAt,
      e.updatedAt,
      COALESCE(COUNT(DISTINCT CASE WHEN a.es_falta = 1 THEN a.fecha END), 0) as dias_falta_periodo
    FROM empleados e
    LEFT JOIN departamentos d ON d.id = e.departamento_id
    LEFT JOIN asistencias a ON a.empleado_id = e.id ${periodoJoin}${selected.sql}
    LEFT JOIN ajustes_nomina_periodo anp ON anp.empleado_id = e.id ${ajustePeriodoJoin}
    WHERE ${incluirInactivos ? "1=1" : "e.activo = 1"}
    GROUP BY e.id, e.nombre, e.departamento_id, d.nombre, e.notas, e.banco, e.numero_cuenta, e.tarjeta, e.clabe_interbancaria, e.salario_mensual, e.bonos, e.dias_laborados, e.dias_laborados_manual, e.descuentos_adicionales, e.nomina_lista, anp.bonos, anp.dias_laborados, anp.dias_laborados_manual, anp.descuentos_adicionales, anp.nomina_lista, e.activo, e.createdAt, e.updatedAt
    ORDER BY e.nombre
  `, [...periodoParams, ...selected.params, ...ajustePeriodoParams]) as any;
  await rawConn.end();
  return rows as (typeof empleados.$inferSelect & { departamentoNombre?: string | null; dias_falta_periodo?: number })[];
}

export async function getEmpleadosEliminados() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: empleados.id,
      nombre: empleados.nombre,
      departamentoId: empleados.departamentoId,
      departamentoNombre: departamentos.nombre,
      notas: empleados.notas,
      banco: empleados.banco,
      numeroCuenta: empleados.numeroCuenta,
      tarjeta: empleados.tarjeta,
      clabeInterbancaria: empleados.clabeInterbancaria,
      salarioMensual: empleados.salarioMensual,
      bonos: empleados.bonos,
      diasLaborados: empleados.diasLaborados,
      diasLaboradosManual: empleados.diasLaboradosManual,
      descuentosAdicionales: empleados.descuentosAdicionales,
      nominaLista: empleados.nominaLista,
      activo: empleados.activo,
      createdAt: empleados.createdAt,
      updatedAt: empleados.updatedAt,
    })
    .from(empleados)
    .leftJoin(departamentos, eq(departamentos.id, empleados.departamentoId))
    .where(eq(empleados.activo, false))
    .orderBy(desc(empleados.updatedAt));
  return rows;
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
  return db.insert(empleados).values(data);
}

export async function actualizarEmpleado(id: number, data: Partial<InsertEmpleado>, periodoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  const camposPorPeriodo = new Set(["bonos", "diasLaborados", "diasLaboradosManual", "descuentosAdicionales", "nominaLista"]);
  const ajusteData: Record<string, unknown> = {};
  const globalData: Record<string, unknown> = {};

  for (const [campo, valor] of Object.entries(data as Record<string, unknown>)) {
    if (periodoId && camposPorPeriodo.has(campo)) ajusteData[campo] = valor;
    else globalData[campo] = valor;
  }

  if (Object.keys(globalData).length > 0) {
    await db.update(empleados).set(globalData as Partial<InsertEmpleado>).where(eq(empleados.id, id));
  }

  if (periodoId && Object.keys(ajusteData).length > 0) {
    const rawConn = await getRawConnection();
    try {
      const columnas: string[] = [];
      const valores: unknown[] = [];
      const updates: string[] = [];
      const agregar = (columna: string, valor: unknown) => {
        columnas.push(columna);
        valores.push(valor);
        updates.push(`${columna} = VALUES(${columna})`);
      };

      if (ajusteData.bonos !== undefined) agregar("bonos", ajusteData.bonos);
      if (ajusteData.diasLaborados !== undefined) agregar("dias_laborados", ajusteData.diasLaborados);
      if (ajusteData.diasLaboradosManual !== undefined) agregar("dias_laborados_manual", ajusteData.diasLaboradosManual ? 1 : 0);
      if (ajusteData.descuentosAdicionales !== undefined) agregar("descuentos_adicionales", ajusteData.descuentosAdicionales);
      if (ajusteData.nominaLista !== undefined) agregar("nomina_lista", ajusteData.nominaLista ? 1 : 0);

      if (columnas.length > 0) {
        await rawConn.execute(
          `INSERT INTO ajustes_nomina_periodo (empleado_id, periodo_id, ${columnas.join(", ")})
           VALUES (?, ?, ${columnas.map(() => "?").join(", ")})
           ON DUPLICATE KEY UPDATE ${updates.join(", ")}`,
          [id, periodoId, ...valores],
        );
      }
    } finally {
      await rawConn.end();
    }
  }
}

export async function sumarDiasFestivosEmpleados(input: { periodoId: number; dias: number; empleadoIds?: number[] }) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  const dias = Math.max(0, Math.round(Number(input.dias || 0)));
  if (dias <= 0) return { affectedRows: 0 };

  const rawConn = await getRawConnection();
  try {
    const empleadoFilter = input.empleadoIds && input.empleadoIds.length > 0
      ? ` AND e.id IN (${input.empleadoIds.map(() => "?").join(",")})`
      : "";
    const params = input.empleadoIds && input.empleadoIds.length > 0 ? input.empleadoIds : [];

    const [result] = await rawConn.execute(
      `INSERT INTO ajustes_nomina_periodo (empleado_id, periodo_id, dias_laborados, dias_laborados_manual)
       SELECT e.id, ?, GREATEST(0, COALESCE(anp.dias_laborados, e.dias_laborados, 0) + ?), 1
       FROM empleados e
       LEFT JOIN ajustes_nomina_periodo anp ON anp.empleado_id = e.id AND anp.periodo_id = ?
       WHERE e.activo = 1${empleadoFilter}
       ON DUPLICATE KEY UPDATE
         dias_laborados = VALUES(dias_laborados),
         dias_laborados_manual = 1`,
      [input.periodoId, dias, input.periodoId, ...params],
    ) as any;

    return { affectedRows: Number(result?.affectedRows ?? result?.changedRows ?? 0) };
  } finally {
    await rawConn.end();
  }
}

export async function eliminarEmpleado(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.update(empleados).set({ activo: false }).where(eq(empleados.id, id));
}

export async function restaurarEmpleado(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.update(empleados).set({ activo: true }).where(eq(empleados.id, id));
}

export async function limpiarHistorialEliminados() {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.delete(empleados).where(eq(empleados.activo, false));
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
  return db.insert(periodos).values(data);
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

export async function updateDiasSeleccionadosPeriodo(id: number, diasSeleccionados: string[] | null) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  const result = await db.update(periodos).set({ diasSeleccionados }).where(eq(periodos.id, id));
  await recalcularDiasLaboradosPeriodo(id, diasSeleccionados ?? undefined);
  return result;
}

export async function recalcularDiasLaboradosPeriodo(periodoId: number, diasSeleccionados?: string[] | null) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  const dias = diasSeleccionados ?? (await getPeriodoDiasSeleccionados(periodoId)) ?? (await getDiasPeriodo(periodoId));
  const rawConn = await getRawConnection();
  try {
    if (!dias || dias.length === 0) {
      await rawConn.execute(
        `UPDATE empleados e
         SET e.dias_laborados = 0
         WHERE e.activo = 1
           AND e.dias_laborados_manual = 0
           AND EXISTS (SELECT 1 FROM asistencias a WHERE a.empleado_id = e.id AND a.periodo_id = ?)`,
        [periodoId],
      );
      return;
    }

    const placeholders = dias.map(() => "?").join(",");
    await rawConn.execute(
      `UPDATE empleados e
       LEFT JOIN (
         SELECT
           a.empleado_id,
           SUM(CASE
             WHEN a.es_descanso = 0
              AND a.es_falta = 0
              AND DAYOFWEEK(a.fecha) <> 1
             THEN 1 ELSE 0 END) AS dias_laborados
         FROM asistencias a
         WHERE a.periodo_id = ?
           AND a.fecha IN (${placeholders})
         GROUP BY a.empleado_id
       ) calc ON calc.empleado_id = e.id
       SET e.dias_laborados = COALESCE(calc.dias_laborados, 0)
       WHERE e.activo = 1
         AND e.dias_laborados_manual = 0
         AND EXISTS (SELECT 1 FROM asistencias ax WHERE ax.empleado_id = e.id AND ax.periodo_id = ?)`,
      [periodoId, ...dias, periodoId],
    );
  } finally {
    await rawConn.end();
  }
}

export async function getSabadosPeriodo(periodoId: number) {
  const db = await getDb();
  if (!db) return [];
  const rawConn = await getRawConnection();
  const [rows] = await rawConn.execute(
    `SELECT
       a.fecha,
       COUNT(*) AS total,
       SUM(CASE WHEN a.es_descanso = 1 THEN 1 ELSE 0 END) AS descansos,
       SUM(CASE WHEN a.es_falta = 1 THEN 1 ELSE 0 END) AS faltas,
       SUM(CASE WHEN a.es_descanso = 0 AND a.es_falta = 0 THEN 1 ELSE 0 END) AS asistencias
     FROM asistencias a
     WHERE a.periodo_id = ?
       AND DAYOFWEEK(a.fecha) = 7
     GROUP BY a.fecha
     ORDER BY a.fecha`,
    [periodoId],
  ) as any;
  await rawConn.end();
  return rows as { fecha: string; total: number; descansos: number; faltas: number; asistencias: number }[];
}

export async function actualizarEstadoSabadosPeriodo(input: {
  periodoId: number;
  fechas: string[];
  estado: "asistencia" | "falta" | "descanso";
  empleadoIds?: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  if (input.fechas.length === 0) return { affectedRows: 0 };

  const rawConn = await getRawConnection();
  try {
    const fechasPlaceholders = input.fechas.map(() => "?").join(",");
    const empleadoFilter = input.empleadoIds && input.empleadoIds.length > 0
      ? ` AND empleado_id IN (${input.empleadoIds.map(() => "?").join(",")})`
      : "";
    const params = [input.periodoId, ...input.fechas, ...(input.empleadoIds ?? [])];

    const setSql = input.estado === "asistencia"
      ? `es_falta = 0, es_descanso = 0, entrada = 'Asistencia', salida_comida = 'Asistencia', entrada_comida = 'Asistencia', salida = 'Asistencia'`
      : input.estado === "falta"
        ? `es_falta = 1, es_descanso = 0, entrada = NULL, salida_comida = NULL, entrada_comida = NULL, salida = NULL`
        : `es_falta = 0, es_descanso = 1, entrada = NULL, salida_comida = NULL, entrada_comida = NULL, salida = NULL`;

    const [result] = await rawConn.execute(
      `UPDATE asistencias
       SET ${setSql}
       WHERE periodo_id = ?
         AND fecha IN (${fechasPlaceholders})
         AND DAYOFWEEK(fecha) = 7
         ${empleadoFilter}`,
      params,
    ) as any;

    await recalcularDiasLaboradosPeriodo(input.periodoId);
    return { affectedRows: Number(result?.affectedRows ?? 0) };
  } finally {
    await rawConn.end();
  }
}

export async function getDiasPeriodo(periodoId: number) {
  const db = await getDb();
  if (!db) return [];
  const rawConn = await getRawConnection();
  const [rows] = await rawConn.execute(
    `SELECT fecha FROM asistencias WHERE periodo_id = ? GROUP BY fecha ORDER BY fecha`,
    [periodoId],
  ) as any;
  await rawConn.end();
  return rows.map((r: { fecha: string }) => r.fecha);
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
