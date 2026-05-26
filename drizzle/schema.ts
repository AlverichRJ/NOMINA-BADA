import {
  boolean,
  decimal,
  int,
  json,
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
  role: mysqlEnum("role", ["user", "admin", "reportes"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabla de departamentos
export const departamentos = mysqlTable("departamentos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull().unique(),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Departamento = typeof departamentos.$inferSelect;
export type InsertDepartamento = typeof departamentos.$inferInsert;

// Tabla de empleados
export const empleados = mysqlTable("empleados", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  departamentoId: int("departamento_id"),
  notas: text("notas"),
  banco: varchar("banco", { length: 120 }),
  numeroCuenta: varchar("numero_cuenta", { length: 80 }),
  tarjeta: varchar("tarjeta", { length: 80 }),
  clabeInterbancaria: varchar("clabe_interbancaria", { length: 80 }),
  salarioMensual: decimal("salario_mensual", { precision: 12, scale: 2 }).notNull().default("0"),
  bonos: decimal("bonos", { precision: 12, scale: 2 }).notNull().default("0"),
  diasLaborados: int("dias_laborados").notNull().default(0),
  diasLaboradosManual: boolean("dias_laborados_manual").notNull().default(false),
  descuentosAdicionales: decimal("descuentos_adicionales", { precision: 12, scale: 2 }).notNull().default("0"),
  nominaLista: boolean("nomina_lista").notNull().default(false),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Empleado = typeof empleados.$inferSelect;
export type InsertEmpleado = typeof empleados.$inferInsert;

// Ajustes manuales de nómina por período/archivo TXT.
// Estos campos permiten que bonos, días laborados, descuentos y estado de nómina lista
// sean independientes para cada archivo TXT seleccionado, sin contaminar otros períodos.
export const ajustesNominaPeriodo = mysqlTable("ajustes_nomina_periodo", {
  id: int("id").autoincrement().primaryKey(),
  empleadoId: int("empleado_id").notNull(),
  periodoId: int("periodo_id").notNull(),
  bonos: decimal("bonos", { precision: 12, scale: 2 }),
  diasLaborados: int("dias_laborados"),
  diasLaboradosManual: boolean("dias_laborados_manual").notNull().default(false),
  descuentosAdicionales: decimal("descuentos_adicionales", { precision: 12, scale: 2 }),
  nominaLista: boolean("nomina_lista"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AjusteNominaPeriodo = typeof ajustesNominaPeriodo.$inferSelect;
export type InsertAjusteNominaPeriodo = typeof ajustesNominaPeriodo.$inferInsert;

// Tabla de períodos (cada archivo TXT subido)
export const periodos = mysqlTable("periodos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  fechaInicio: varchar("fecha_inicio", { length: 10 }).notNull(),
  fechaFin: varchar("fecha_fin", { length: 10 }).notNull(),
  archivoNombre: varchar("archivo_nombre", { length: 255 }),
  diasSeleccionados: json("dias_seleccionados").$type<string[] | null>(),
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
  salidaComida: varchar("salida_comida", { length: 20 }),
  entradaComida: varchar("entrada_comida", { length: 20 }),
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
