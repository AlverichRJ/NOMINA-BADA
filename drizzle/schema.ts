import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  time,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabla de empleados
export const empleados = mysqlTable("empleados", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  salarioMensual: decimal("salario_mensual", { precision: 12, scale: 2 }).notNull().default("0"),
  bonos: decimal("bonos", { precision: 12, scale: 2 }).notNull().default("0"),
  diasLaborados: int("dias_laborados").notNull().default(0),
  descuentosAdicionales: decimal("descuentos_adicionales", { precision: 12, scale: 2 }).notNull().default("0"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Empleado = typeof empleados.$inferSelect;
export type InsertEmpleado = typeof empleados.$inferInsert;

// Tabla de períodos (cada archivo TXT subido)
export const periodos = mysqlTable("periodos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  fechaInicio: varchar("fecha_inicio", { length: 10 }).notNull(),
  fechaFin: varchar("fecha_fin", { length: 10 }).notNull(),
  archivoNombre: varchar("archivo_nombre", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Periodo = typeof periodos.$inferSelect;
export type InsertPeriodo = typeof periodos.$inferInsert;

// Tabla de asistencias por día por empleado
export const asistencias = mysqlTable("asistencias", {
  id: int("id").autoincrement().primaryKey(),
  empleadoId: int("empleado_id").notNull(),
  periodoId: int("periodo_id").notNull(),
  fecha: varchar("fecha", { length: 10 }).notNull(),
  entrada: varchar("entrada", { length: 20 }),
  salida: varchar("salida", { length: 20 }),
  esFalta: boolean("es_falta").notNull().default(false),
  esDescanso: boolean("es_descanso").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Asistencia = typeof asistencias.$inferSelect;
export type InsertAsistencia = typeof asistencias.$inferInsert;

// Tabla de cálculos de nómina por empleado por período
export const calculosNomina = mysqlTable("calculos_nomina", {
  id: int("id").autoincrement().primaryKey(),
  empleadoId: int("empleado_id").notNull(),
  periodoId: int("periodo_id").notNull(),
  diasLaborables: int("dias_laborables").notNull().default(0),
  diasAsistidos: int("dias_asistidos").notNull().default(0),
  diasFalta: int("dias_falta").notNull().default(0),
  descuento: decimal("descuento", { precision: 12, scale: 2 }).notNull().default("0"),
  salarioAPagar: decimal("salario_a_pagar", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalculoNomina = typeof calculosNomina.$inferSelect;
export type InsertCalculoNomina = typeof calculosNomina.$inferInsert;

// Tabla de configuración de la app (nombre, logo, etc.)
export const appConfig = mysqlTable("app_config", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppConfig = typeof appConfig.$inferSelect;
export type InsertAppConfig = typeof appConfig.$inferInsert;
