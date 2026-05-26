var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar
} from "drizzle-orm/mysql-core";
var users, departamentos, empleados, periodos, asistencias, calculosNomina, appConfig;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      id: int("id").autoincrement().primaryKey(),
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    departamentos = mysqlTable("departamentos", {
      id: int("id").autoincrement().primaryKey(),
      nombre: varchar("nombre", { length: 120 }).notNull().unique(),
      activo: boolean("activo").notNull().default(true),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    empleados = mysqlTable("empleados", {
      id: int("id").autoincrement().primaryKey(),
      nombre: varchar("nombre", { length: 255 }).notNull(),
      departamentoId: int("departamento_id"),
      salarioMensual: decimal("salario_mensual", { precision: 12, scale: 2 }).notNull().default("0"),
      bonos: decimal("bonos", { precision: 12, scale: 2 }).notNull().default("0"),
      diasLaborados: int("dias_laborados").notNull().default(0),
      descuentosAdicionales: decimal("descuentos_adicionales", { precision: 12, scale: 2 }).notNull().default("0"),
      activo: boolean("activo").notNull().default(true),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    periodos = mysqlTable("periodos", {
      id: int("id").autoincrement().primaryKey(),
      nombre: varchar("nombre", { length: 255 }).notNull(),
      fechaInicio: varchar("fecha_inicio", { length: 10 }).notNull(),
      fechaFin: varchar("fecha_fin", { length: 10 }).notNull(),
      archivoNombre: varchar("archivo_nombre", { length: 255 }),
      diasSeleccionados: json("dias_seleccionados").$type(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    asistencias = mysqlTable("asistencias", {
      id: int("id").autoincrement().primaryKey(),
      empleadoId: int("empleado_id").notNull(),
      periodoId: int("periodo_id").notNull(),
      fecha: varchar("fecha", { length: 10 }).notNull(),
      entrada: varchar("entrada", { length: 20 }),
      salida: varchar("salida", { length: 20 }),
      esFalta: boolean("es_falta").notNull().default(false),
      esDescanso: boolean("es_descanso").notNull().default(false),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    calculosNomina = mysqlTable("calculos_nomina", {
      id: int("id").autoincrement().primaryKey(),
      empleadoId: int("empleado_id").notNull(),
      periodoId: int("periodo_id").notNull(),
      diasLaborables: int("dias_laborables").notNull().default(0),
      diasAsistidos: int("dias_asistidos").notNull().default(0),
      diasFalta: int("dias_falta").notNull().default(0),
      descuento: decimal("descuento", { precision: 12, scale: 2 }).notNull().default("0"),
      salarioAPagar: decimal("salario_a_pagar", { precision: 12, scale: 2 }).notNull().default("0"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    appConfig = mysqlTable("app_config", {
      id: int("id").autoincrement().primaryKey(),
      key: varchar("key", { length: 100 }).notNull().unique(),
      value: text("value"),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
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
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  actualizarDepartamento: () => actualizarDepartamento,
  actualizarEmpleado: () => actualizarEmpleado,
  actualizarEstadoSabadosPeriodo: () => actualizarEstadoSabadosPeriodo,
  crearDepartamento: () => crearDepartamento,
  crearEmpleado: () => crearEmpleado,
  crearPeriodo: () => crearPeriodo,
  deletePeriodo: () => deletePeriodo,
  eliminarAsistenciasPeriodo: () => eliminarAsistenciasPeriodo,
  eliminarCalculosPeriodo: () => eliminarCalculosPeriodo,
  eliminarDepartamento: () => eliminarDepartamento,
  eliminarEmpleado: () => eliminarEmpleado,
  getAllUsers: () => getAllUsers,
  getAppConfig: () => getAppConfig,
  getAsistenciasByEmpleadoPeriodo: () => getAsistenciasByEmpleadoPeriodo,
  getAsistenciasByPeriodo: () => getAsistenciasByPeriodo,
  getCalculosByPeriodo: () => getCalculosByPeriodo,
  getDb: () => getDb,
  getDepartamentos: () => getDepartamentos,
  getDiasPeriodo: () => getDiasPeriodo,
  getEmpleadoById: () => getEmpleadoById,
  getEmpleadoByNombre: () => getEmpleadoByNombre,
  getEmpleados: () => getEmpleados,
  getPeriodoById: () => getPeriodoById,
  getPeriodoDiasSeleccionados: () => getPeriodoDiasSeleccionados,
  getPeriodos: () => getPeriodos,
  getSabadosPeriodo: () => getSabadosPeriodo,
  getUserByOpenId: () => getUserByOpenId,
  insertarAsistencias: () => insertarAsistencias,
  recalcularDiasLaboradosPeriodo: () => recalcularDiasLaboradosPeriodo,
  renamePeriodo: () => renamePeriodo,
  setAppConfig: () => setAppConfig,
  updateDiasSeleccionadosPeriodo: () => updateDiasSeleccionadosPeriodo,
  updateUserRole: () => updateUserRole,
  upsertCalculoNomina: () => upsertCalculoNomina,
  upsertUser: () => upsertUser
});
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
async function getRawConnection() {
  const mysql2 = await import("mysql2/promise");
  return mysql2.createConnection(process.env.DATABASE_URL);
}
async function columnExists(rawConn, table, column) {
  const [rows] = await rawConn.execute(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows?.[0]?.total ?? 0) > 0;
}
async function ensureAppSchema() {
  if (schemaReady || !process.env.DATABASE_URL) return;
  const rawConn = await getRawConnection();
  try {
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
    if (!await columnExists(rawConn, "empleados", "departamento_id")) {
      await rawConn.execute(`ALTER TABLE empleados ADD departamento_id int NULL`);
    }
    if (!await columnExists(rawConn, "periodos", "dias_seleccionados")) {
      await rawConn.execute(`ALTER TABLE periodos ADD dias_seleccionados json NULL`);
    }
    for (const nombre of DEPARTAMENTOS_INICIALES) {
      await rawConn.execute(
        `INSERT INTO departamentos (nombre, activo) VALUES (?, true)
         ON DUPLICATE KEY UPDATE activo = true`,
        [nombre]
      );
    }
    schemaReady = true;
  } finally {
    await rawConn.end();
  }
}
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod"];
  for (const field of textFields) {
    const value = user[field];
    if (value !== void 0) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
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
  if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    loginMethod: users.loginMethod,
    lastSignedIn: users.lastSignedIn,
    createdAt: users.createdAt
  }).from(users).orderBy(users.createdAt);
}
async function updateUserRole(id, role) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, id));
}
async function getDepartamentos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departamentos).where(eq(departamentos.activo, true)).orderBy(departamentos.nombre);
}
async function crearDepartamento(data) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.insert(departamentos).values(data);
}
async function actualizarDepartamento(id, nombre) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.update(departamentos).set({ nombre }).where(eq(departamentos.id, id));
}
async function eliminarDepartamento(id) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  await db.update(empleados).set({ departamentoId: null }).where(eq(empleados.departamentoId, id));
  return db.update(departamentos).set({ activo: false }).where(eq(departamentos.id, id));
}
function buildSelectedDaysCondition(alias = "a", selectedDays) {
  if (!selectedDays || selectedDays.length === 0) return { sql: "", params: [] };
  return {
    sql: ` AND ${alias}.fecha IN (${selectedDays.map(() => "?").join(",")})`,
    params: selectedDays
  };
}
async function getPeriodoDiasSeleccionados(periodoId) {
  const periodo = await getPeriodoById(periodoId);
  const value = periodo?.diasSeleccionados ?? periodo?.dias_seleccionados ?? null;
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
async function getEmpleados(periodoId) {
  const db = await getDb();
  if (!db) return [];
  const rawConn = await getRawConnection();
  const selectedDays = periodoId ? await getPeriodoDiasSeleccionados(periodoId) : null;
  const selected = buildSelectedDaysCondition("a", selectedDays);
  const periodoJoin = periodoId ? "AND a.periodo_id = ?" : "AND a.periodo_id = (SELECT MAX(id) FROM periodos)";
  const periodoParams = periodoId ? [periodoId] : [];
  const [rows] = await rawConn.execute(`
    SELECT
      e.id,
      e.nombre,
      e.departamento_id AS departamentoId,
      d.nombre AS departamentoNombre,
      e.salario_mensual AS salarioMensual,
      e.bonos,
      e.dias_laborados AS diasLaborados,
      e.descuentos_adicionales AS descuentosAdicionales,
      e.activo,
      e.createdAt,
      e.updatedAt,
      COALESCE(SUM(CASE WHEN a.es_falta = 1 THEN 1 ELSE 0 END), 0) as dias_falta_periodo
    FROM empleados e
    LEFT JOIN departamentos d ON d.id = e.departamento_id
    LEFT JOIN asistencias a ON a.empleado_id = e.id ${periodoJoin}${selected.sql}
    WHERE e.activo = 1
    GROUP BY e.id, e.nombre, e.departamento_id, d.nombre, e.salario_mensual, e.bonos, e.dias_laborados, e.descuentos_adicionales, e.activo, e.createdAt, e.updatedAt
    ORDER BY e.nombre
  `, [...periodoParams, ...selected.params]);
  await rawConn.end();
  return rows;
}
async function getEmpleadoById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(empleados).where(eq(empleados.id, id)).limit(1);
  return result[0];
}
async function getEmpleadoByNombre(nombre) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(empleados).where(eq(empleados.nombre, nombre)).limit(1);
  return result[0];
}
async function crearEmpleado(data) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.insert(empleados).values(data);
}
async function actualizarEmpleado(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.update(empleados).set(data).where(eq(empleados.id, id));
}
async function eliminarEmpleado(id) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.update(empleados).set({ activo: false }).where(eq(empleados.id, id));
}
async function getPeriodos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(periodos).orderBy(desc(periodos.createdAt));
}
async function getPeriodoById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(periodos).where(eq(periodos.id, id)).limit(1);
  return result[0];
}
async function crearPeriodo(data) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.insert(periodos).values(data);
}
async function deletePeriodo(id) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.delete(periodos).where(eq(periodos.id, id));
}
async function renamePeriodo(id, nombre) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.update(periodos).set({ nombre }).where(eq(periodos.id, id));
}
async function updateDiasSeleccionadosPeriodo(id, diasSeleccionados) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  const result = await db.update(periodos).set({ diasSeleccionados }).where(eq(periodos.id, id));
  await recalcularDiasLaboradosPeriodo(id, diasSeleccionados ?? void 0);
  return result;
}
async function recalcularDiasLaboradosPeriodo(periodoId, diasSeleccionados) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  const dias = diasSeleccionados ?? await getPeriodoDiasSeleccionados(periodoId) ?? await getDiasPeriodo(periodoId);
  const rawConn = await getRawConnection();
  try {
    if (!dias || dias.length === 0) {
      await rawConn.execute(
        `UPDATE empleados e
         SET e.dias_laborados = 0
         WHERE e.activo = 1
           AND EXISTS (SELECT 1 FROM asistencias a WHERE a.empleado_id = e.id AND a.periodo_id = ?)`,
        [periodoId]
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
         AND EXISTS (SELECT 1 FROM asistencias ax WHERE ax.empleado_id = e.id AND ax.periodo_id = ?)`,
      [periodoId, ...dias, periodoId]
    );
  } finally {
    await rawConn.end();
  }
}
async function getSabadosPeriodo(periodoId) {
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
    [periodoId]
  );
  await rawConn.end();
  return rows;
}
async function actualizarEstadoSabadosPeriodo(input) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  if (input.fechas.length === 0) return { affectedRows: 0 };
  const rawConn = await getRawConnection();
  try {
    const fechasPlaceholders = input.fechas.map(() => "?").join(",");
    const empleadoFilter = input.empleadoIds && input.empleadoIds.length > 0 ? ` AND empleado_id IN (${input.empleadoIds.map(() => "?").join(",")})` : "";
    const params = [input.periodoId, ...input.fechas, ...input.empleadoIds ?? []];
    const setSql = input.estado === "asistencia" ? `es_falta = 0, es_descanso = 0, entrada = COALESCE(entrada, 'Manual'), salida = COALESCE(salida, '')` : input.estado === "falta" ? `es_falta = 1, es_descanso = 0, entrada = NULL, salida = NULL` : `es_falta = 0, es_descanso = 1, entrada = NULL, salida = NULL`;
    const [result] = await rawConn.execute(
      `UPDATE asistencias
       SET ${setSql}
       WHERE periodo_id = ?
         AND fecha IN (${fechasPlaceholders})
         AND DAYOFWEEK(fecha) = 7
         ${empleadoFilter}`,
      params
    );
    await recalcularDiasLaboradosPeriodo(input.periodoId);
    return { affectedRows: Number(result?.affectedRows ?? 0) };
  } finally {
    await rawConn.end();
  }
}
async function getDiasPeriodo(periodoId) {
  const db = await getDb();
  if (!db) return [];
  const rawConn = await getRawConnection();
  const [rows] = await rawConn.execute(
    `SELECT fecha FROM asistencias WHERE periodo_id = ? GROUP BY fecha ORDER BY fecha`,
    [periodoId]
  );
  await rawConn.end();
  return rows.map((r) => r.fecha);
}
async function getAsistenciasByPeriodo(periodoId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(asistencias).where(eq(asistencias.periodoId, periodoId)).orderBy(asistencias.empleadoId, asistencias.fecha);
}
async function getAsistenciasByEmpleadoPeriodo(empleadoId, periodoId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(asistencias).where(and(eq(asistencias.empleadoId, empleadoId), eq(asistencias.periodoId, periodoId))).orderBy(asistencias.fecha);
}
async function insertarAsistencias(data) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  if (data.length === 0) return;
  for (let i = 0; i < data.length; i += 100) {
    await db.insert(asistencias).values(data.slice(i, i + 100));
  }
}
async function eliminarAsistenciasPeriodo(periodoId) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.delete(asistencias).where(eq(asistencias.periodoId, periodoId));
}
async function getCalculosByPeriodo(periodoId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calculosNomina).where(eq(calculosNomina.periodoId, periodoId)).orderBy(calculosNomina.empleadoId);
}
async function upsertCalculoNomina(data) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.insert(calculosNomina).values(data).onDuplicateKeyUpdate({
    set: {
      diasLaborables: data.diasLaborables,
      diasAsistidos: data.diasAsistidos,
      diasFalta: data.diasFalta,
      descuento: data.descuento,
      salarioAPagar: data.salarioAPagar
    }
  });
}
async function eliminarCalculosPeriodo(periodoId) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.delete(calculosNomina).where(eq(calculosNomina.periodoId, periodoId));
}
async function getAppConfig() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appConfig);
}
async function setAppConfig(key, value) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.insert(appConfig).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}
var _db, schemaReady, DEPARTAMENTOS_INICIALES;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    _db = null;
    schemaReady = false;
    DEPARTAMENTOS_INICIALES = [
      "Edicion",
      "Social Media",
      "Produccion",
      "Dise\xF1o",
      "Mantenimiento",
      "Administracion"
    ];
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  storageGet: () => storageGet,
  storageGetSignedUrl: () => storageGetSignedUrl,
  storagePut: () => storagePut
});
import * as fs from "fs";
import * as path2 from "path";
function getUploadsDir() {
  const dir = ENV.uploadsDir || "uploads";
  return path2.isAbsolute(dir) ? dir : path2.resolve(process.cwd(), dir);
}
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
async function storagePut(relKey, data, _contentType = "application/octet-stream") {
  const key = appendHashSuffix(normalizeKey(relKey));
  const uploadsDir = getUploadsDir();
  const filePath = path2.join(uploadsDir, key);
  const fileDir = path2.dirname(filePath);
  ensureDir(fileDir);
  const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);
  fs.writeFileSync(filePath, buffer);
  return { key, url: `/uploads/${key}` };
}
async function storageGet(relKey) {
  const key = normalizeKey(relKey);
  return { key, url: `/uploads/${key}` };
}
async function storageGetSignedUrl(relKey) {
  const key = normalizeKey(relKey);
  return `/uploads/${key}`;
}
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_env();
  }
});

// server/_core/index.ts
import "dotenv/config";
import express3 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/oauth.ts
init_db();
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/oauth.ts
init_env();

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var SDKServer = class {
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }
    return new TextEncoder().encode(secret);
  }
  /**
   * Crea un token de sesión JWT firmado con HS256.
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: "local",
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId: isNonEmptyString(appId) ? appId : "local",
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const user = await getUserByOpenId(session.openId);
    if (!user) {
      throw ForbiddenError("User not found");
    }
    upsertUser({
      openId: user.openId,
      lastSignedIn: /* @__PURE__ */ new Date()
    }).catch((e) => console.warn("[Auth] Failed to update lastSignedIn:", e));
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getCallbackURL() {
  if (ENV.appBaseUrl) {
    return `${ENV.appBaseUrl}/api/oauth/google/callback`;
  }
  return "/api/oauth/google/callback";
}
function registerOAuthRoutes(app) {
  if (!ENV.googleClientId || !ENV.googleClientSecret) {
    console.warn(
      "[OAuth] Google OAuth no configurado. Establece GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET."
    );
    app.get("/api/oauth/google", (_req, res) => {
      res.status(503).json({
        error: "Google OAuth no configurado en el servidor",
        message: "Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env"
      });
    });
    return;
  }
  passport.use(
    new GoogleStrategy(
      {
        clientID: ENV.googleClientId,
        clientSecret: ENV.googleClientSecret,
        callbackURL: getCallbackURL(),
        passReqToCallback: false
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value ?? null;
          const name = profile.displayName || email || googleId;
          await upsertUser({
            openId: googleId,
            name,
            email,
            loginMethod: "google",
            lastSignedIn: /* @__PURE__ */ new Date()
          });
          const user = await getUserByOpenId(googleId);
          if (!user) {
            return done(new Error("No se pudo crear el usuario"), void 0);
          }
          return done(null, user);
        } catch (error) {
          return done(error, void 0);
        }
      }
    )
  );
  app.use(passport.initialize());
  app.get(
    "/api/oauth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false
    })
  );
  app.get(
    "/api/oauth/google/callback",
    passport.authenticate("google", {
      session: false,
      failureRedirect: "/?error=auth_failed"
    }),
    async (req, res) => {
      try {
        const user = req.user;
        if (!user || !user.openId) {
          res.status(400).json({ error: "No se recibio informacion del usuario" });
          return;
        }
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS
        });
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS
        });
        const returnTo = req.query.state || "/";
        res.redirect(302, returnTo.startsWith("/") ? returnTo : "/");
      } catch (error) {
        console.error("[OAuth] Error en callback de Google:", error);
        res.redirect("/?error=auth_failed");
      }
    }
  );
  console.log("[OAuth] Google OAuth configurado correctamente");
}

// server/_core/storageProxy.ts
init_env();
import express from "express";
import * as path from "path";
function registerStorageProxy(app) {
  const uploadsDir = ENV.uploadsDir || "uploads";
  const absoluteUploadsDir = path.isAbsolute(uploadsDir) ? uploadsDir : path.resolve(process.cwd(), uploadsDir);
  app.use("/uploads", express.static(absoluteUploadsDir, {
    maxAge: "1d",
    etag: true
  }));
  app.get("/manus-storage/*", (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      fetch(forgeUrl.toString(), {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      }).then(async (forgeResp) => {
        if (!forgeResp.ok) {
          const body = await forgeResp.text().catch(() => "");
          console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
          res.status(502).send("Storage backend error");
          return;
        }
        const { url } = await forgeResp.json();
        if (!url) {
          res.status(502).send("Empty signed URL from backend");
          return;
        }
        res.set("Cache-Control", "no-store");
        res.redirect(307, url);
      }).catch((err) => {
        console.error("[StorageProxy] failed:", err);
        res.status(502).send("Storage proxy error");
      });
      return;
    }
    res.redirect(301, `/uploads/${key}`);
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    const normalizedBase = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const endpoint = new URL(
      "webdevtoken.v1.WebDevService/SendNotification",
      normalizedBase
    ).toString();
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
          "content-type": "application/json",
          "connect-protocol-version": "1"
        },
        body: JSON.stringify({ title, content })
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.warn(
          `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.warn("[Notification] Error calling notification service:", error);
      return false;
    }
  }
  console.log(`[Notification] ${title}: ${content}`);
  return true;
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
init_db();
import { z as z2 } from "zod";

// server/parser.ts
var MESES = {
  ene: "01",
  jan: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
  dec: "12"
};
function parsearFecha(diaStr, mesStr, anioStr) {
  const mes = MESES[mesStr.toLowerCase()];
  if (!mes) return null;
  const anio = anioStr.length === 2 ? `20${anioStr}` : anioStr;
  const dia = diaStr.padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}
function convertirHora12(horaStr) {
  const match = horaStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return horaStr;
  const [, h, m, ampm] = match;
  return `${h.padStart(2, "0")}:${m} ${ampm.toUpperCase()}`;
}
function extraerHoras(linea) {
  const lineaSinFecha = linea.replace(/\d{1,2}\/[a-záéíóú]+\/(\d{2})/gi, (match, anio) => {
    return match.slice(0, -anio.length) + "XX";
  });
  const regex = /(?<!\d)(\d{1,2}):(\d{2})(am|pm)/gi;
  const resultados = [];
  let matchResult;
  while ((matchResult = regex.exec(lineaSinFecha)) !== null) {
    resultados.push(convertirHora12(`${matchResult[1]}:${matchResult[2]}${matchResult[3]}`));
  }
  return resultados;
}
function parsearArchivo(contenido) {
  const lineas = contenido.split(/\r?\n/);
  const empleados2 = [];
  let empleadoActual = null;
  let diaActual = null;
  let horasAcumuladas = [];
  const reEmpleado = /^\s*\(\d+\)\s+(.+?)\s*$/;
  const reFechaCorta = /^\s*[^\d\/\r\n]+?\s+(\d{1,2})\/([a-záéíóúñ]+)\/(\d{2})(?=\d{1,2}:|\s|$)/i;
  const reEstado = /^\s*[^\d\/\r\n]+?\s+(\d{1,2})\/([a-záéíóúñ]+)\/(\d{2,4})\s*(Asistido|Falta|Descanso)/i;
  const reIngreso = /Fecha de ingreso:\s*(\S+)/i;
  const reHorario = /Horario:\s*(.+)/i;
  const reDiasAsistidos = /D[ií]as laborables asistidos:\s*(\d+)\s+de\s+(\d+)/i;
  const reFaltasAsistencia = /Faltas de asistencia:\s*(\d+)/i;
  const reSoloHoras = /^\s*\d{1,2}:\d{2}(?:am|pm)/i;
  let fechaInicio = null;
  let fechaFin = null;
  const guardarDiaActual = () => {
    if (diaActual && empleadoActual) {
      if (horasAcumuladas.length > 0 && !diaActual.esFalta && !diaActual.esDescanso) {
        diaActual.entrada = horasAcumuladas[0] || null;
        diaActual.salida = horasAcumuladas.length > 1 ? horasAcumuladas[horasAcumuladas.length - 1] : null;
      }
      empleadoActual.registros.push(diaActual);
      diaActual = null;
      horasAcumuladas = [];
    }
  };
  for (const linea of lineas) {
    const matchEmpleado = linea.match(reEmpleado);
    if (matchEmpleado && !linea.match(/Fecha|Horario|Tiempo|Resumen|D[ií]as|Faltas|Asistido|Falta|Descanso/i)) {
      guardarDiaActual();
      if (empleadoActual) {
        empleados2.push(empleadoActual);
      }
      empleadoActual = {
        nombre: matchEmpleado[1].trim(),
        fechaIngreso: null,
        horario: null,
        registros: [],
        diasLaborablesAsistidos: 0,
        faltasAsistencia: 0
      };
      diaActual = null;
      horasAcumuladas = [];
      continue;
    }
    if (!empleadoActual) continue;
    const matchIngreso = linea.match(reIngreso);
    if (matchIngreso) {
      empleadoActual.fechaIngreso = matchIngreso[1];
      continue;
    }
    const matchHorario = linea.match(reHorario);
    if (matchHorario) {
      empleadoActual.horario = matchHorario[1].trim();
      continue;
    }
    const matchDiasAsistidos = linea.match(reDiasAsistidos);
    if (matchDiasAsistidos) {
      empleadoActual.diasLaborablesAsistidos = parseInt(matchDiasAsistidos[1]);
      continue;
    }
    const matchFaltasAsistencia = linea.match(reFaltasAsistencia);
    if (matchFaltasAsistencia) {
      empleadoActual.faltasAsistencia = parseInt(matchFaltasAsistencia[1]);
      continue;
    }
    const matchEstado = linea.match(reEstado);
    if (matchEstado) {
      const [, dia, mes, anio, estado] = matchEstado;
      const fecha = parsearFecha(dia, mes, anio);
      if (!fecha) continue;
      if (diaActual && diaActual.fecha !== fecha) {
        guardarDiaActual();
      }
      const esFalta = /falta/i.test(estado);
      const esDescanso = /descanso/i.test(estado);
      if (!diaActual || diaActual.fecha !== fecha) {
        diaActual = {
          fecha,
          entrada: null,
          salida: null,
          esFalta,
          esDescanso
        };
      } else {
        diaActual.esFalta = esFalta;
        diaActual.esDescanso = esDescanso;
      }
      if (!fechaInicio || fecha < fechaInicio) fechaInicio = fecha;
      if (!fechaFin || fecha > fechaFin) fechaFin = fecha;
      continue;
    }
    const matchFechaCorta = linea.match(reFechaCorta);
    if (matchFechaCorta) {
      const [, dia, mes, anio] = matchFechaCorta;
      const fecha = parsearFecha(dia, mes, anio);
      if (!fecha) continue;
      if (diaActual && diaActual.fecha !== fecha) {
        guardarDiaActual();
      }
      if (!diaActual || diaActual.fecha !== fecha) {
        diaActual = {
          fecha,
          entrada: null,
          salida: null,
          esFalta: false,
          esDescanso: false
        };
        horasAcumuladas = [];
      }
      if (/falta/i.test(linea)) {
        diaActual.esFalta = true;
      }
      const horas = extraerHoras(linea);
      for (const hora of horas) {
        horasAcumuladas.push(hora);
      }
      if (!fechaInicio || fecha < fechaInicio) fechaInicio = fecha;
      if (!fechaFin || fecha > fechaFin) fechaFin = fecha;
      continue;
    }
    if (reSoloHoras.test(linea) && diaActual) {
      const horas = extraerHoras(linea);
      for (const hora of horas) {
        horasAcumuladas.push(hora);
      }
      continue;
    }
    if (/falta/i.test(linea) && diaActual && !/faltas de asistencia/i.test(linea) && !/tomando en cuenta faltas/i.test(linea)) {
      diaActual.esFalta = true;
    }
  }
  guardarDiaActual();
  if (empleadoActual) {
    empleados2.push(empleadoActual);
  }
  return { empleados: empleados2, fechaInicio, fechaFin };
}
function esDomingo(fechaStr) {
  const fecha = /* @__PURE__ */ new Date(fechaStr + "T12:00:00Z");
  return fecha.getUTCDay() === 0;
}
function calcularDescuento(salarioMensual, diasFalta) {
  return salarioMensual / 30 * diasFalta;
}
function calcularSalarioAPagar(salarioMensual, diasLaborables, bonos, descuento) {
  return salarioMensual / 30 * diasLaborables + bonos - descuento;
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // ─── DEPARTAMENTOS ────────────────────────────────────────────────────────
  departamentos: router({
    list: publicProcedure.query(async () => {
      return getDepartamentos();
    }),
    create: adminProcedure.input(z2.object({ nombre: z2.string().min(1) })).mutation(async ({ input }) => {
      await crearDepartamento({ nombre: input.nombre.trim(), activo: true });
      return { success: true };
    }),
    update: adminProcedure.input(z2.object({ id: z2.number(), nombre: z2.string().min(1) })).mutation(async ({ input }) => {
      await actualizarDepartamento(input.id, input.nombre.trim());
      return { success: true };
    }),
    delete: adminProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await eliminarDepartamento(input.id);
      return { success: true };
    })
  }),
  // ─── EMPLEADOS ─────────────────────────────────────────────────────────────
  empleados: router({
    list: publicProcedure.input(z2.object({ periodoId: z2.number().optional() }).optional()).query(async ({ input }) => {
      return getEmpleados(input?.periodoId);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getEmpleadoById(input.id);
    }),
    create: adminProcedure.input(
      z2.object({
        nombre: z2.string().min(1),
        salarioMensual: z2.number().min(0),
        bonos: z2.number().min(0).default(0),
        departamentoId: z2.number().nullable().optional()
      })
    ).mutation(async ({ input }) => {
      await crearEmpleado({
        nombre: input.nombre,
        salarioMensual: input.salarioMensual.toFixed(2),
        bonos: input.bonos.toFixed(2),
        departamentoId: input.departamentoId ?? null
      });
      return { success: true };
    }),
    update: adminProcedure.input(
      z2.object({
        id: z2.number(),
        nombre: z2.string().min(1).optional(),
        salarioMensual: z2.number().min(0).optional(),
        bonos: z2.number().min(0).optional(),
        diasLaborados: z2.number().min(0).optional(),
        descuentosAdicionales: z2.number().min(0).optional(),
        departamentoId: z2.number().nullable().optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData = {};
      if (data.nombre !== void 0) updateData.nombre = data.nombre;
      if (data.salarioMensual !== void 0) updateData.salarioMensual = data.salarioMensual.toFixed(2);
      if (data.bonos !== void 0) updateData.bonos = data.bonos.toFixed(2);
      if (data.diasLaborados !== void 0) updateData.diasLaborados = data.diasLaborados;
      if (data.descuentosAdicionales !== void 0) updateData.descuentosAdicionales = data.descuentosAdicionales.toFixed(2);
      if (data.departamentoId !== void 0) updateData.departamentoId = data.departamentoId;
      await actualizarEmpleado(id, updateData);
      return { success: true };
    }),
    delete: adminProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await eliminarEmpleado(input.id);
      return { success: true };
    })
  }),
  // ─── PERIODOS ──────────────────────────────────────────────────────────────
  periodos: router({
    list: publicProcedure.query(async () => {
      return getPeriodos();
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getPeriodoById(input.id);
    }),
    delete: adminProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await eliminarAsistenciasPeriodo(input.id);
      await eliminarCalculosPeriodo(input.id);
      await deletePeriodo(input.id);
      return { success: true };
    }),
    rename: adminProcedure.input(z2.object({ id: z2.number(), nombre: z2.string().min(1) })).mutation(async ({ input }) => {
      await renamePeriodo(input.id, input.nombre);
      return { success: true };
    }),
    getDias: publicProcedure.input(z2.object({ periodoId: z2.number() })).query(async ({ input }) => {
      const dias = await getDiasPeriodo(input.periodoId);
      const seleccionados = await getPeriodoDiasSeleccionados(input.periodoId);
      return { dias, seleccionados: seleccionados ?? dias };
    }),
    updateDiasSeleccionados: adminProcedure.input(z2.object({ periodoId: z2.number(), dias: z2.array(z2.string()) })).mutation(async ({ input }) => {
      await updateDiasSeleccionadosPeriodo(input.periodoId, input.dias);
      return { success: true };
    }),
    getSabados: publicProcedure.input(z2.object({ periodoId: z2.number() })).query(async ({ input }) => {
      return getSabadosPeriodo(input.periodoId);
    }),
    actualizarSabados: adminProcedure.input(z2.object({
      periodoId: z2.number(),
      fechas: z2.array(z2.string()).min(1),
      estado: z2.enum(["asistencia", "falta", "descanso"]),
      empleadoIds: z2.array(z2.number()).optional()
    })).mutation(async ({ input }) => {
      const result = await actualizarEstadoSabadosPeriodo(input);
      return { success: true, ...result };
    })
  }),
  // ─── REPORTES ──────────────────────────────────────────────────────────────
  reportes: router({
    procesarArchivo: adminProcedure.input(
      z2.object({
        contenido: z2.string(),
        nombreArchivo: z2.string()
      })
    ).mutation(async ({ input }) => {
      const { empleados: empleadosParsed, fechaInicio, fechaFin } = parsearArchivo(input.contenido);
      if (!fechaInicio || !fechaFin) {
        throw new Error("No se pudo determinar el rango de fechas del archivo");
      }
      const periodosExistentes = await getPeriodos();
      const periodoExistente = periodosExistentes.find(
        (p) => p.nombre === `${fechaInicio} al ${fechaFin}` || p.archivoNombre === input.nombreArchivo
      );
      let periodoId;
      if (periodoExistente) {
        periodoId = periodoExistente.id;
        await eliminarAsistenciasPeriodo(periodoId);
        await eliminarCalculosPeriodo(periodoId);
      } else {
        const nombrePeriodo = `${fechaInicio} al ${fechaFin}`;
        await crearPeriodo({
          nombre: nombrePeriodo,
          fechaInicio,
          fechaFin,
          archivoNombre: input.nombreArchivo
        });
        const periodosDB = await getPeriodos();
        const periodoActual = periodosDB[0];
        if (!periodoActual) throw new Error("Error al crear per\xEDodo");
        periodoId = periodoActual.id;
      }
      const empleadosDB = await getEmpleados();
      const empleadosMap = new Map(empleadosDB.map((e) => [e.nombre.toLowerCase().trim(), e]));
      function normalizarNombre(s) {
        return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
      }
      function similitudNombre(a, b) {
        const palabrasA = new Set(normalizarNombre(a).split(" ").filter((p) => p.length >= 3));
        const palabrasB = new Set(normalizarNombre(b).split(" ").filter((p) => p.length >= 3));
        let comunes = 0;
        Array.from(palabrasA).forEach((p) => {
          if (palabrasB.has(p)) comunes++;
        });
        return comunes;
      }
      const resultados = [];
      for (const empParsed of empleadosParsed) {
        let empleadoDB = empleadosMap.get(empParsed.nombre.toLowerCase().trim());
        if (!empleadoDB) {
          let mejorScore = 0;
          let mejorMatch = null;
          for (const emp of empleadosDB) {
            const score = similitudNombre(empParsed.nombre, emp.nombre);
            if (score > mejorScore) {
              mejorScore = score;
              mejorMatch = emp;
            }
          }
          if (mejorMatch && mejorScore >= 2) {
            empleadoDB = mejorMatch;
          }
        }
        if (!empleadoDB) {
          await crearEmpleado({
            nombre: empParsed.nombre,
            salarioMensual: "0",
            bonos: "0"
          });
          const empCreado = await getEmpleadoByNombre(empParsed.nombre);
          if (!empCreado) continue;
          empleadoDB = empCreado;
        }
        if (!empleadoDB) continue;
        const empleadoId = empleadoDB.id;
        const salario = parseFloat(empleadoDB.salarioMensual) || 0;
        const bonos = parseFloat(empleadoDB.bonos) || 0;
        const asistenciasData = empParsed.registros.map((r) => ({
          empleadoId,
          periodoId,
          fecha: r.fecha,
          entrada: r.entrada,
          salida: r.salida,
          esFalta: r.esFalta,
          esDescanso: r.esDescanso
        }));
        await insertarAsistencias(asistenciasData);
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
          salarioAPagar: Math.max(0, salarioAPagar).toFixed(2)
        });
        await actualizarEmpleado(empleadoId, { diasLaborados: Math.max(0, diasAsistidos) });
        resultados.push({
          nombre: empParsed.nombre,
          diasLaborables,
          diasAsistidos: Math.max(0, diasAsistidos),
          diasFalta,
          descuento,
          salarioAPagar: Math.max(0, salarioAPagar)
        });
      }
      const periodoFinal = periodoExistente ?? (await getPeriodos())[0];
      return {
        periodoId,
        nombrePeriodo: periodoFinal?.nombre ?? `${fechaInicio} al ${fechaFin}`,
        totalEmpleados: resultados.length,
        resultados
      };
    }),
    getReportePeriodo: publicProcedure.input(z2.object({ periodoId: z2.number() })).query(async ({ input }) => {
      const periodo = await getPeriodoById(input.periodoId);
      if (!periodo) throw new Error("Per\xEDodo no encontrado");
      const asistenciasTodas = await getAsistenciasByPeriodo(input.periodoId);
      const diasPeriodo = await getDiasPeriodo(input.periodoId);
      const diasSeleccionados = await getPeriodoDiasSeleccionados(input.periodoId);
      const diasActivos = diasSeleccionados && diasSeleccionados.length > 0 ? diasSeleccionados : diasPeriodo;
      const diasActivosSet = new Set(diasActivos);
      const asistenciasDB = asistenciasTodas.filter((a) => diasActivosSet.has(a.fecha));
      const empleadosDB = await getEmpleados();
      const empleadosMap = new Map(empleadosDB.map((e) => [e.id, e]));
      const asistenciasPorEmpleado = /* @__PURE__ */ new Map();
      for (const a of asistenciasDB) {
        if (!asistenciasPorEmpleado.has(a.empleadoId)) {
          asistenciasPorEmpleado.set(a.empleadoId, []);
        }
        asistenciasPorEmpleado.get(a.empleadoId).push(a);
      }
      const calculos = Array.from(asistenciasPorEmpleado.entries()).map(([empleadoId, asistenciasEmpleado]) => {
        const emp = empleadosMap.get(empleadoId);
        const asistenciasOrdenadas = asistenciasEmpleado.sort((a, b) => a.fecha.localeCompare(b.fecha));
        const salario = parseFloat(String(emp?.salarioMensual ?? "0")) || 0;
        const bonos = parseFloat(String(emp?.bonos ?? "0")) || 0;
        const diasLaborables = asistenciasOrdenadas.filter((r) => !r.esDescanso && !esDomingo(r.fecha)).length;
        const diasFalta = asistenciasOrdenadas.filter((r) => r.esFalta).length;
        const diasAsistidos = Math.max(0, diasLaborables - diasFalta);
        const descuento = calcularDescuento(salario, diasFalta);
        const salarioAPagar = calcularSalarioAPagar(salario, diasLaborables, bonos, descuento);
        return {
          empleadoId,
          periodoId: input.periodoId,
          diasLaborables,
          diasAsistidos,
          diasFalta,
          descuento: descuento.toFixed(2),
          salarioAPagar: Math.max(0, salarioAPagar).toFixed(2),
          empleadoNombre: emp?.nombre || "Desconocido",
          departamentoId: emp?.departamentoId ?? null,
          departamentoNombre: emp?.departamentoNombre ?? null,
          salarioMensual: salario,
          bonos,
          asistencias: asistenciasOrdenadas
        };
      });
      return {
        periodo,
        calculos,
        diasPeriodo,
        diasSeleccionados: diasActivos,
        totalEmpleados: calculos.length,
        promedioAsistencia: calculos.length > 0 ? calculos.reduce(
          (sum, c) => sum + (c.diasLaborables > 0 ? c.diasAsistidos / c.diasLaborables * 100 : 0),
          0
        ) / calculos.length : 0,
        empleadosCriticos: calculos.filter((c) => c.diasFalta >= 3).sort((a, b) => b.diasFalta - a.diasFalta)
      };
    }),
    getAsistenciasEmpleado: publicProcedure.input(z2.object({ empleadoId: z2.number(), periodoId: z2.number() })).query(async ({ input }) => {
      return getAsistenciasByEmpleadoPeriodo(input.empleadoId, input.periodoId);
    })
  }),
  // ─── IMPORTACIÓN DE SALARIOS ──────────────────────────────────────────────────────────────────────
  salarios: router({
    // Previsualizar los datos del archivo antes de importar
    preview: adminProcedure.input(z2.object({ contenido: z2.string(), formato: z2.enum(["csv", "xlsx_base64"]) })).mutation(async ({ input }) => {
      const filas = parsearArchivoSalarios(input.contenido, input.formato);
      return { filas, total: filas.length };
    }),
    // Confirmar e importar los salarios a la BD
    importar: adminProcedure.input(
      z2.object({
        filas: z2.array(
          z2.object({
            nombre: z2.string(),
            salarioMensual: z2.number(),
            bonos: z2.number().optional().default(0)
          })
        )
      })
    ).mutation(async ({ input }) => {
      const empleadosDB = await getEmpleados();
      function normNombre(s) {
        return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
      }
      function similitud(a, b) {
        const pa = new Set(normNombre(a).split(" ").filter((p) => p.length >= 3));
        const pb = new Set(normNombre(b).split(" ").filter((p) => p.length >= 3));
        let c = 0;
        Array.from(pa).forEach((p) => {
          if (pb.has(p)) c++;
        });
        return c;
      }
      const resultados = [];
      for (const fila of input.filas) {
        let emp = empleadosDB.find((e) => normNombre(e.nombre) === normNombre(fila.nombre));
        if (!emp) {
          let mejorScore = 0, mejorMatch = null;
          for (const e of empleadosDB) {
            const s = similitud(fila.nombre, e.nombre);
            if (s > mejorScore) {
              mejorScore = s;
              mejorMatch = e;
            }
          }
          if (mejorMatch && mejorScore >= 2) emp = mejorMatch;
        }
        if (emp) {
          await actualizarEmpleado(emp.id, {
            salarioMensual: fila.salarioMensual.toFixed(2),
            bonos: (fila.bonos ?? 0).toFixed(2)
          });
          resultados.push({ nombre: fila.nombre, accion: "actualizado", empleadoId: emp.id });
        } else {
          await crearEmpleado({
            nombre: fila.nombre,
            salarioMensual: fila.salarioMensual.toFixed(2),
            bonos: (fila.bonos ?? 0).toFixed(2)
          });
          resultados.push({ nombre: fila.nombre, accion: "creado", empleadoId: null });
        }
      }
      return { total: resultados.length, resultados };
    })
  }),
  // ─── CONFIGURACIÓN DE LA APP ────────────────────────────────────────────────────────────
  config: router({
    get: publicProcedure.query(async () => {
      const db = await Promise.resolve().then(() => (init_db(), db_exports));
      const rows = await db.getAppConfig();
      const result = {};
      for (const row of rows) {
        result[row.key] = row.value ?? "";
      }
      return result;
    }),
    set: adminProcedure.input(z2.object({ key: z2.string(), value: z2.string() })).mutation(async ({ input }) => {
      const db = await Promise.resolve().then(() => (init_db(), db_exports));
      await db.setAppConfig(input.key, input.value);
      return { success: true };
    }),
    uploadLogo: adminProcedure.input(z2.object({
      // base64 data URL: "data:image/png;base64,..."
      dataUrl: z2.string().min(1),
      mimeType: z2.string().default("image/png")
    })).mutation(async ({ input }) => {
      const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const db = await Promise.resolve().then(() => (init_db(), db_exports));
      const matches = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) throw new Error("Formato de imagen inv\xE1lido");
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("gif") ? "gif" : mimeType.includes("webp") ? "webp" : "jpg";
      const key = `app-logos/logo.${ext}`;
      const { url } = await storagePut2(key, buffer, mimeType);
      await db.setAppConfig("app_logo", url);
      return { success: true, url };
    })
  }),
  // ─── USUARIOS (solo admin) ──────────────────────────────────────────────────
  usuarios: router({
    list: adminProcedure.query(async () => {
      return getAllUsers();
    }),
    updateRole: adminProcedure.input(z2.object({
      id: z2.number(),
      role: z2.enum(["user", "admin"])
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user.id === input.id && input.role !== "admin") {
        throw new Error("No puedes quitarte el rol de admin a ti mismo");
      }
      await updateUserRole(input.id, input.role);
      return { success: true };
    })
  })
});
function parsearArchivoSalarios(contenido, formato) {
  if (formato === "csv") {
    const lineas = contenido.split(/\r?\n/).filter((l) => l.trim());
    const filas = [];
    for (const linea of lineas.slice(1)) {
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
    const XLSX = __require("xlsx");
    const buf = Buffer.from(contenido, "base64");
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const filas = [];
    for (const row of rows.slice(1)) {
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

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express2 from "express";
import fs3 from "fs";
import { nanoid } from "nanoid";
import path4 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs2 from "node:fs";
import path3 from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path3.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs2.existsSync(LOG_DIR)) {
    fs2.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs2.existsSync(logPath) || fs2.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs2.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs2.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path3.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs2.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path3.resolve(import.meta.dirname),
  root: path3.resolve(import.meta.dirname, "client"),
  publicDir: path3.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path4.resolve(import.meta.dirname, "../..", "dist", "public") : path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express2.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/exportar.ts
init_db();
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
init_schema();
function formatCurrency(n) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
function formatFecha(fecha) {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [y, m, d] = fecha.split("-");
  return `${d} ${meses[parseInt(m) - 1]} ${y}`;
}
async function getReporteData(periodoId) {
  const periodo = await getPeriodoById(periodoId);
  if (!periodo) throw new Error("Per\xEDodo no encontrado");
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  const todosEmpleados = await db.select().from(empleados);
  const empleadosMap = new Map(todosEmpleados.map((e) => [e.id, e]));
  const asistenciasTodas = await getAsistenciasByPeriodo(periodoId);
  const calculosDB = await getCalculosByPeriodo(periodoId);
  const diasPeriodo = await getDiasPeriodo(periodoId);
  const diasSeleccionados = await getPeriodoDiasSeleccionados(periodoId);
  const diasActivos = diasSeleccionados && diasSeleccionados.length > 0 ? diasSeleccionados : diasPeriodo;
  const diasActivosSet = new Set(diasActivos);
  const asistenciasDB = asistenciasTodas.filter((a) => diasActivosSet.has(a.fecha));
  const asistenciasPorEmpleado = /* @__PURE__ */ new Map();
  for (const a of asistenciasDB) {
    if (!asistenciasPorEmpleado.has(a.empleadoId)) asistenciasPorEmpleado.set(a.empleadoId, []);
    asistenciasPorEmpleado.get(a.empleadoId).push(a);
  }
  const calculos = calculosDB.map((c) => {
    const emp = empleadosMap.get(c.empleadoId);
    const asistencias2 = (asistenciasPorEmpleado.get(c.empleadoId) || []).sort(
      (a, b) => a.fecha.localeCompare(b.fecha)
    );
    const salarioMensual = parseFloat(String(emp?.salarioMensual) || "0");
    const bonos = parseFloat(String(emp?.bonos) || "0");
    const diasLaborables = asistencias2.filter((a) => !a.esDescanso && !esDomingo(a.fecha)).length;
    const diasFalta = asistencias2.filter((a) => a.esFalta && !a.esDescanso && !esDomingo(a.fecha)).length;
    const diasAsistidos = asistencias2.filter((a) => !a.esFalta && !a.esDescanso && !esDomingo(a.fecha)).length;
    const descuento = calcularDescuento(salarioMensual, diasFalta);
    const salarioAPagar = calcularSalarioAPagar(salarioMensual, diasLaborables, bonos, descuento);
    return {
      ...c,
      empleadoNombre: emp?.nombre || "Desconocido",
      salarioMensual,
      bonos,
      diasLaborables,
      diasFalta,
      diasAsistidos,
      descuento,
      salarioAPagar,
      asistencias: asistencias2
    };
  });
  return { periodo, calculos };
}
async function generarPDF(periodoId) {
  const { periodo, calculos } = await getReporteData(periodoId);
  return new Promise((resolve3, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve3(Buffer.concat(chunks)));
    doc.on("error", reject);
    const NAVY = "#1a2744";
    const NAVY_LIGHT = "#2d3f6b";
    const RED = "#c53030";
    const RED_BG = "#fff5f5";
    const GREEN = "#276749";
    const GRAY = "#718096";
    const LIGHT_GRAY = "#f7fafc";
    const WHITE = "#ffffff";
    const W = 595 - 100;
    doc.rect(0, 0, 595, 120).fill(NAVY);
    doc.fillColor(WHITE).fontSize(22).font("Helvetica-Bold").text("REPORTE DE CONTROL DE ASISTENCIAS", 50, 35, { width: W });
    doc.fontSize(12).font("Helvetica").text(`Per\xEDodo: ${periodo.nombre}`, 50, 68, { width: W });
    doc.fontSize(10).text(`Generado: ${(/* @__PURE__ */ new Date()).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}`, 50, 88, { width: W });
    doc.fillColor(NAVY).fontSize(14).font("Helvetica-Bold").text("Resumen Ejecutivo", 50, 140);
    doc.moveTo(50, 158).lineTo(545, 158).strokeColor(NAVY).lineWidth(1.5).stroke();
    const totalNomina = calculos.reduce((s, c) => s + c.salarioAPagar, 0);
    const totalDescuentos = calculos.reduce((s, c) => s + c.descuento, 0);
    const promedioAsistencia = calculos.length > 0 ? calculos.reduce((s, c) => s + (c.diasLaborables > 0 ? c.diasAsistidos / c.diasLaborables * 100 : 0), 0) / calculos.length : 0;
    const stats = [
      ["Total Empleados", String(calculos.length)],
      ["Promedio Asistencia", `${promedioAsistencia.toFixed(1)}%`],
      ["Total Descuentos", formatCurrency(totalDescuentos)],
      ["Total N\xF3mina a Pagar", formatCurrency(totalNomina)]
    ];
    let sx = 50;
    const sy = 168;
    const sw = (W - 15) / 4;
    for (const [label, val] of stats) {
      doc.rect(sx, sy, sw, 52).fill(LIGHT_GRAY);
      doc.fillColor(GRAY).fontSize(8).font("Helvetica").text(label, sx + 8, sy + 8, { width: sw - 16 });
      doc.fillColor(NAVY).fontSize(13).font("Helvetica-Bold").text(val, sx + 8, sy + 22, { width: sw - 16 });
      sx += sw + 5;
    }
    let y = 240;
    const colWidths = [130, 85, 85, 60];
    const colX = [50, 180, 265, 350, 410];
    const headers = ["FECHA", "ENTRADA", "SALIDA", "FALTAS"];
    for (const emp of calculos) {
      const rowsNeeded = emp.asistencias.length;
      const spaceNeeded = 80 + rowsNeeded * 18 + 40;
      if (y + spaceNeeded > 780) {
        doc.addPage();
        y = 50;
      }
      doc.rect(50, y, W, 28).fill(NAVY);
      doc.fillColor(WHITE).fontSize(11).font("Helvetica-Bold").text(emp.empleadoNombre, 58, y + 8, { width: W - 16 });
      y += 28;
      doc.rect(50, y, W, 20).fill(LIGHT_GRAY);
      doc.fillColor(GRAY).fontSize(8).font("Helvetica").text(
        `Salario: ${formatCurrency(emp.salarioMensual)}   Bonos: ${formatCurrency(emp.bonos)}   Descuento: ${formatCurrency(emp.descuento)}   A Pagar: ${formatCurrency(emp.salarioAPagar)}   Asistidos: ${emp.diasAsistidos}/${emp.diasLaborables}   Faltas: ${emp.diasFalta}`,
        58,
        y + 6,
        { width: W - 16 }
      );
      y += 20;
      doc.rect(50, y, W, 18).fill(NAVY_LIGHT);
      for (let i = 0; i < headers.length; i++) {
        doc.fillColor(WHITE).fontSize(7.5).font("Helvetica-Bold").text(headers[i], colX[i], y + 5, { width: colWidths[i], align: "center" });
      }
      y += 18;
      for (let ri = 0; ri < emp.asistencias.length; ri++) {
        const a = emp.asistencias[ri];
        const isFalta = a.esFalta;
        const isDescanso = a.esDescanso;
        const rowH = 16;
        if (y + rowH > 790) {
          doc.addPage();
          y = 50;
          doc.rect(50, y, W, 18).fill(NAVY_LIGHT);
          for (let i = 0; i < headers.length; i++) {
            doc.fillColor(WHITE).fontSize(7.5).font("Helvetica-Bold").text(headers[i], colX[i], y + 5, { width: colWidths[i], align: "center" });
          }
          y += 18;
        }
        const rowBg = isFalta ? RED_BG : ri % 2 === 0 ? WHITE : LIGHT_GRAY;
        doc.rect(50, y, W, rowH).fill(rowBg);
        const textColor = isFalta ? RED : NAVY;
        doc.fillColor(textColor).fontSize(8).font(isFalta ? "Helvetica-Bold" : "Helvetica");
        doc.text(formatFecha(a.fecha), colX[0], y + 4, { width: colWidths[0], align: "center" });
        doc.text(isDescanso ? "Descanso" : a.entrada || "\u2014", colX[1], y + 4, { width: colWidths[1], align: "center" });
        doc.text(isDescanso ? "\u2014" : a.salida || "\u2014", colX[2], y + 4, { width: colWidths[2], align: "center" });
        if (isDescanso) {
          doc.fillColor(GRAY).text("\u2014", colX[3], y + 4, { width: colWidths[3], align: "center" });
        } else if (isFalta) {
          doc.fillColor(RED).font("Helvetica-Bold").text("S\xCD", colX[3], y + 4, { width: colWidths[3], align: "center" });
        } else {
          doc.fillColor(GREEN).text("NO", colX[3], y + 4, { width: colWidths[3], align: "center" });
        }
        doc.rect(50, y, W, rowH).strokeColor("#e2e8f0").lineWidth(0.3).stroke();
        y += rowH;
      }
      y += 20;
    }
    doc.end();
  });
}
async function generarExcel(periodoId) {
  const { periodo, calculos } = await getReporteData(periodoId);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema de Asistencias";
  const wsResumen = wb.addWorksheet("Resumen");
  wsResumen.columns = [
    { header: "Empleado", key: "nombre", width: 35 },
    { header: "Salario Mensual", key: "salario", width: 18 },
    { header: "Bonos", key: "bonos", width: 14 },
    { header: "D\xEDas Laborables", key: "diasLab", width: 18 },
    { header: "D\xEDas Asistidos", key: "diasAsis", width: 17 },
    { header: "Faltas", key: "faltas", width: 10 },
    { header: "Descuento", key: "descuento", width: 16 },
    { header: "Salario a Pagar", key: "salarioPagar", width: 18 }
  ];
  const headerRow = wsResumen.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a2744" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF2d3f6b" } }
    };
  });
  headerRow.height = 22;
  for (let i = 0; i < calculos.length; i++) {
    const c = calculos[i];
    const row = wsResumen.addRow({
      nombre: c.empleadoNombre,
      salario: c.salarioMensual,
      bonos: c.bonos,
      diasLab: c.diasLaborables,
      diasAsis: c.diasAsistidos,
      faltas: c.diasFalta,
      descuento: c.descuento,
      salarioPagar: c.salarioAPagar
    });
    const bg = i % 2 === 0 ? "FFF7FAFC" : "FFFFFFFF";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.alignment = { vertical: "middle" };
    });
    ["salario", "bonos", "descuento", "salarioPagar"].forEach((key) => {
      const cell = row.getCell(key);
      cell.numFmt = '"$"#,##0.00';
    });
    if (c.diasFalta > 0) {
      const faltaCell = row.getCell("faltas");
      faltaCell.font = { bold: true, color: { argb: "FFC53030" } };
      faltaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF5F5" } };
    }
    row.height = 18;
  }
  for (const emp of calculos) {
    const wsName = emp.empleadoNombre.substring(0, 31).replace(/[\/\\?*\[\]]/g, "");
    const ws = wb.addWorksheet(wsName);
    ws.mergeCells("A1:D1");
    ws.getCell("A1").value = emp.empleadoNombre;
    ws.getCell("A1").font = { bold: true, size: 13, color: { argb: "FF1a2744" } };
    ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFf0f4ff" } };
    ws.getCell("A2").value = "Salario Mensual";
    ws.getCell("B2").value = emp.salarioMensual;
    ws.getCell("B2").numFmt = '"$"#,##0.00';
    ws.getCell("C2").value = "Bonos";
    ws.getCell("D2").value = emp.bonos;
    ws.getCell("D2").numFmt = '"$"#,##0.00';
    ws.getCell("A3").value = "D\xEDas Laborables";
    ws.getCell("B3").value = emp.diasLaborables;
    ws.getCell("C3").value = "Faltas";
    ws.getCell("D3").value = emp.diasFalta;
    if (emp.diasFalta > 0) {
      ws.getCell("D3").font = { bold: true, color: { argb: "FFC53030" } };
    }
    ws.getCell("A4").value = "Descuento";
    ws.getCell("B4").value = emp.descuento;
    ws.getCell("B4").numFmt = '"$"#,##0.00';
    ws.getCell("C4").value = "A Pagar";
    ws.getCell("D4").value = emp.salarioAPagar;
    ws.getCell("D4").numFmt = '"$"#,##0.00';
    ws.getCell("D4").font = { bold: true, color: { argb: "FF1a2744" } };
    ws.columns = [
      { key: "fecha", width: 18 },
      { key: "entrada", width: 14 },
      { key: "salida", width: 14 },
      { key: "falta", width: 10 }
    ];
    const tHeaderRow = ws.getRow(6);
    tHeaderRow.values = ["FECHA", "ENTRADA", "SALIDA", "FALTAS"];
    tHeaderRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a2744" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { horizontal: "center" };
    });
    tHeaderRow.height = 20;
    emp.asistencias.forEach((a, idx) => {
      const row = ws.getRow(7 + idx);
      const isFalta = a.esFalta;
      const isDescanso = a.esDescanso;
      row.values = [
        formatFecha(a.fecha),
        isDescanso ? "Descanso" : a.entrada || "\u2014",
        isDescanso ? "\u2014" : a.salida || "\u2014",
        isDescanso ? "\u2014" : isFalta ? "S\xCD" : "NO"
      ];
      const bg = isFalta ? "FFFFF5F5" : idx % 2 === 0 ? "FFFFFFFF" : "FFF7FAFC";
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.alignment = { horizontal: "center" };
      });
      if (isFalta) {
        row.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFC53030" } };
        });
      }
      row.height = 16;
    });
  }
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve3) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve3(true));
    });
    server.on("error", () => resolve3(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express3();
  const server = createServer(app);
  app.use(express3.json({ limit: "50mb" }));
  app.use(express3.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  app.get("/api/export/pdf/:periodoId", async (req, res) => {
    try {
      const periodoId = parseInt(req.params.periodoId);
      const buffer = await generarPDF(periodoId);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Reporte_${periodoId}.pdf"`);
      res.send(buffer);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/export/xlsx/:periodoId", async (req, res) => {
    try {
      const periodoId = parseInt(req.params.periodoId);
      const buffer = await generarExcel(periodoId);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="Reporte_${periodoId}.xlsx"`);
      res.send(buffer);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
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
