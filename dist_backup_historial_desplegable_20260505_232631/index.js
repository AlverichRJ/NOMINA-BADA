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
      role: mysqlEnum("role", ["user", "admin", "reportes"]).default("user").notNull(),
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
      notas: text("notas"),
      banco: varchar("banco", { length: 120 }),
      numeroCuenta: varchar("numero_cuenta", { length: 80 }),
      tarjeta: varchar("tarjeta", { length: 80 }),
      clabeInterbancaria: varchar("clabe_interbancaria", { length: 80 }),
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
      salidaComida: varchar("salida_comida", { length: 20 }),
      entradaComida: varchar("entrada_comida", { length: 20 }),
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

// server/catalogoNomina.ts
var CATALOGO_NOMINA_EMPLEADOS;
var init_catalogoNomina = __esm({
  "server/catalogoNomina.ts"() {
    "use strict";
    CATALOGO_NOMINA_EMPLEADOS = [
      {
        "nombre": "Abraham Torres Ortega",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909840666",
        "tarjeta": "5579 1004 4546 0221",
        "clabeInterbancaria": "0140 2856 9098 406662"
      },
      {
        "nombre": "Adriana Arredondo",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": null,
        "tarjeta": "4152 3145 8561 1240",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Alberto Jes\xFAs D\xEDaz Calder\xF3n",
        "salarioMensual": 15e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": null,
        "tarjeta": "4152 3143 8909 6671",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Alejandra Gutierrez Sanchez (Ana Garc\xEDa)",
        "salarioMensual": 16e3,
        "bonos": 4e3,
        "banco": "BANCOPPEL",
        "numeroCuenta": null,
        "tarjeta": "4169 1606 1068 2974",
        "clabeInterbancaria": "1370 2810 3364 037105"
      },
      {
        "nombre": "Alejandra Mendoza",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1545817983",
        "tarjeta": null,
        "clabeInterbancaria": "0120 2801 5458 179836"
      },
      {
        "nombre": "Alejandro Flores Madue\xF1o",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909822420",
        "tarjeta": "5579 1004 4544 6402",
        "clabeInterbancaria": "0140 2856 9098 224200"
      },
      {
        "nombre": "Ana Paola Beltran Briones",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "25009438274",
        "tarjeta": "5579 0830 4107 6106",
        "clabeInterbancaria": "0140 2825 0094 382743"
      },
      {
        "nombre": "Anais Garcia Padilla",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909831907",
        "tarjeta": "5579 1004 4545 8316",
        "clabeInterbancaria": "0140 2856 9098 319076"
      },
      {
        "nombre": "Angela Magaly Navarro Baro (KEVIN ALAIN)",
        "salarioMensual": 25e3,
        "bonos": 0,
        "banco": "BANORTE",
        "numeroCuenta": null,
        "tarjeta": "4189 1433 3799 6758",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Anneth Mathilda Serrano Gastelum",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1567313118",
        "tarjeta": null,
        "clabeInterbancaria": "0120 2801 5673 131183"
      },
      {
        "nombre": "Arcel Osvaldo Balderas Gomez",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "26022818796",
        "tarjeta": "5579 0900 4233 2503",
        "clabeInterbancaria": "0140 2826 0228 187966"
      },
      {
        "nombre": "Avila Barroso Ricardo Antonio",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909818245",
        "tarjeta": "5579 1004 4545 1675",
        "clabeInterbancaria": "0140 0056 9098 182454"
      },
      {
        "nombre": "Bladimir Madero Salazar",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1595993657",
        "tarjeta": "4152 3141 8608 8236",
        "clabeInterbancaria": "0121 8001 5959 936571"
      },
      {
        "nombre": "Brando Hernandez Qui\xF1onez",
        "salarioMensual": 2e4,
        "bonos": 2e3,
        "banco": "SANTANDER",
        "numeroCuenta": "56879860031",
        "tarjeta": "5579 1004 1388 1044",
        "clabeInterbancaria": "0140 2856 8798 600316"
      },
      {
        "nombre": "Brandon Alexis Herrera Guerra",
        "salarioMensual": 16e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "25010442628",
        "tarjeta": "5579 0830 4339 7880",
        "clabeInterbancaria": "0140 2825 0104 426285"
      },
      {
        "nombre": "Camacho Sandoval Roberto Alejandro",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909840561",
        "tarjeta": "5579 1004 4542 2791",
        "clabeInterbancaria": "0140 2856 9098 405618"
      },
      {
        "nombre": "Carlos Alonso Guerrero Alvarez",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56879860045",
        "tarjeta": "5579 1004 1388 7124",
        "clabeInterbancaria": "0140 2856 8798 600455"
      },
      {
        "nombre": "Carlos Daniel Herrera Martinez",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1547337469",
        "tarjeta": "4152 3142 7926 6608",
        "clabeInterbancaria": "0120 2801 5473 374690"
      },
      {
        "nombre": "Cesar Alejandro Villanueva Aguero",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "BANAMEX",
        "numeroCuenta": null,
        "tarjeta": "5256 7845 7250 5997",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Cesar Andre Lozano Lemus",
        "salarioMensual": 2e4,
        "bonos": 2e3,
        "banco": "BBVA",
        "numeroCuenta": "1566153676",
        "tarjeta": "4152 3145 8972 4775",
        "clabeInterbancaria": "0120 2801 5661 536761"
      },
      {
        "nombre": "C\xE9sar Jesus P\xE9rez Villegas",
        "salarioMensual": 15e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": null,
        "tarjeta": "4152 3139 6534 7847",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Cese\xF1a Romero Braulio",
        "salarioMensual": 2e4,
        "bonos": 4e3,
        "banco": "SANTANDER",
        "numeroCuenta": "20008609710",
        "tarjeta": "5579 0990 1938 7366",
        "clabeInterbancaria": "0140 2220 0086 097102"
      },
      {
        "nombre": "Christian Ivan Hermosillo Villarruel",
        "salarioMensual": 25e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909832140",
        "tarjeta": "5579 1004 4545 9082",
        "clabeInterbancaria": "0140 2856 9098 321404"
      },
      {
        "nombre": "Chuc Mansur Julio Cesar",
        "salarioMensual": 25e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909832839",
        "tarjeta": "5579 1004 4541 0309",
        "clabeInterbancaria": "0140 2856 9098 328397"
      },
      {
        "nombre": "Cristiany Cardenas Rojas",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "NU",
        "numeroCuenta": null,
        "tarjeta": "5101 2503 5722 0803",
        "clabeInterbancaria": "SE PUEDE EN OXXO"
      },
      {
        "nombre": "David Alejandro Valencia Valdez",
        "salarioMensual": 2e4,
        "bonos": 4e3,
        "banco": "SANTANDER",
        "numeroCuenta": "56879860076",
        "tarjeta": "5579 1004 1388 0970",
        "clabeInterbancaria": "0140 2856 8798 600769"
      },
      {
        "nombre": "Derly Yoliand Rodriguez Salto",
        "salarioMensual": 1e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56879859889",
        "tarjeta": "5579 1004 1388 7496",
        "clabeInterbancaria": "0140 2856 8798 598897"
      },
      {
        "nombre": "Diego Alberto Rodriguez Garcia",
        "salarioMensual": 2e4,
        "bonos": 2e3,
        "banco": "SANTANDER",
        "numeroCuenta": "56879860093",
        "tarjeta": "5579 1004 1388 1036",
        "clabeInterbancaria": "0140 2856 8798 600934"
      },
      {
        "nombre": "Edgar Ulises Vargas Leon",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1511490849",
        "tarjeta": "4152 3144 6504 5451",
        "clabeInterbancaria": "0121 8001 5114 908496"
      },
      {
        "nombre": "Edna Yamile Arellano Ramirez",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56879860292",
        "tarjeta": "5579 1004 1388 7546",
        "clabeInterbancaria": "0140 2856 8798 602929"
      },
      {
        "nombre": "Erik Emmanuel Guti\xE9rrez Segura",
        "salarioMensual": 15e3,
        "bonos": 0,
        "banco": "BANAMEX",
        "numeroCuenta": null,
        "tarjeta": "5256 7845 8491 0797",
        "clabeInterbancaria": "0020 2890 5424 872740"
      },
      {
        "nombre": "Esteban Ba\xF1uelos Garc\xEDa",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BANCOPPEL",
        "numeroCuenta": null,
        "tarjeta": "4169 1608 1416 7855",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Esteban Mariano de la Paz Ventura",
        "salarioMensual": 15e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": null,
        "tarjeta": "4152 3146 0271 6196",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Estela Alonso Diaz",
        "salarioMensual": 14500,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1531089940",
        "tarjeta": "4152 3137 8820 3284",
        "clabeInterbancaria": "0120 2801 5310 899403"
      },
      {
        "nombre": "Felipe Rangel",
        "salarioMensual": 12e3,
        "bonos": 0,
        "banco": "BANAMEX",
        "numeroCuenta": null,
        "tarjeta": "5204 1661 0607 0198",
        "clabeInterbancaria": "0020 2870 2062 464700"
      },
      {
        "nombre": "F\xE9lix Enrique Zempoalteca Saucedo",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1538332036",
        "tarjeta": "4152 3144 1259 0476",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Gabriela Guerrero",
        "salarioMensual": 25e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909819129",
        "tarjeta": "5579 1004 4887 5680",
        "clabeInterbancaria": "0140 2856 9098 191294"
      },
      {
        "nombre": "Gabriela Ulloa",
        "salarioMensual": 15e3,
        "bonos": 0,
        "banco": "BANAMEX",
        "numeroCuenta": "2225000",
        "tarjeta": "5204 1674 5830 2890",
        "clabeInterbancaria": "0023 2070 1822 250002"
      },
      {
        "nombre": "Gibran Adrian Roman Corona",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1551051420",
        "tarjeta": null,
        "clabeInterbancaria": "0121 8001 5510 514206"
      },
      {
        "nombre": "Grettel Paola Montes Garc\xEDa",
        "salarioMensual": 15e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1533918119",
        "tarjeta": "4152 3140 1300 8027",
        "clabeInterbancaria": "0121 8001 5339 181195"
      },
      {
        "nombre": "Guillermo Guzman Aceves",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "60556197894",
        "tarjeta": "5579 0701 4471 5748",
        "clabeInterbancaria": "0143 2060 5561 978946"
      },
      {
        "nombre": "Hector Armando Quintero Hernandez",
        "salarioMensual": 16e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1579254609",
        "tarjeta": "4152 3142 4596 8048",
        "clabeInterbancaria": "0120 2801 5792 546099"
      },
      {
        "nombre": "Hector X Martinez",
        "salarioMensual": 16e3,
        "bonos": 0,
        "banco": "BANCO AZTECA",
        "numeroCuenta": "58301347692371",
        "tarjeta": "4027 6658 5937 3152",
        "clabeInterbancaria": "1270 2801 3476 923715"
      },
      {
        "nombre": "Ismael Leonardo Juarez Nolasco",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909810500",
        "tarjeta": "5579 1004 4544 4803",
        "clabeInterbancaria": "0140 2856 9098 105002"
      },
      {
        "nombre": "Ivan Zuno Sierra",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": null,
        "tarjeta": "4152 3143 7736 8389",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Jaquelin Reyes Valerio",
        "salarioMensual": 21e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909803440",
        "tarjeta": "5579 1004 4544 4142",
        "clabeInterbancaria": "0140 2856 9098 034403"
      },
      {
        "nombre": "Jaziel Yair Luna Garcia",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1534281512",
        "tarjeta": "4152 3139 9887 3751",
        "clabeInterbancaria": "0120 2801 5342 815125"
      },
      {
        "nombre": "Jesus Emmanuel Alvares Medina",
        "salarioMensual": 2e4,
        "bonos": 2e3,
        "banco": "BBVA",
        "numeroCuenta": "1569526223",
        "tarjeta": "4152 3142 5665 3729",
        "clabeInterbancaria": "0121 8001 5695 262237"
      },
      {
        "nombre": "Jesus Mauricio Gomez Jimenez",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1536476917",
        "tarjeta": "4152 3142 1897 4312",
        "clabeInterbancaria": "0120 2801 5364 769178"
      },
      {
        "nombre": "Johana Lorena Rios Partida",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1574389163",
        "tarjeta": null,
        "clabeInterbancaria": "0120 2801 5743 891638"
      },
      {
        "nombre": "Jorge Alejandro Melendez Soria",
        "salarioMensual": 25e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1572577313",
        "tarjeta": "4152 3144 2984 9899",
        "clabeInterbancaria": "0120 2801 5725 773130"
      },
      {
        "nombre": "Juan Jose Mendoza Gallardo",
        "salarioMensual": 25e3,
        "bonos": 0,
        "banco": "BANORTE",
        "numeroCuenta": null,
        "tarjeta": "4189 1431 5188 3132",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Karen Gonzalez Cazarin",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": null,
        "numeroCuenta": null,
        "tarjeta": null,
        "clabeInterbancaria": null
      },
      {
        "nombre": "Karla Melissa Cruz Ramirez",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "NU",
        "numeroCuenta": null,
        "tarjeta": "5101 2542 8630 5958",
        "clabeInterbancaria": "SE PUEDE EN OXXO"
      },
      {
        "nombre": "Karla Miranda Serrano Gast\xE9lum",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1576474906",
        "tarjeta": null,
        "clabeInterbancaria": "0120 2801 5764 749060"
      },
      {
        "nombre": "Laura Torres",
        "salarioMensual": 4e4,
        "bonos": 0,
        "banco": "BANAMEX",
        "numeroCuenta": null,
        "tarjeta": "5204 1657 5496 7796",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Lorena Hernandez Carrasco",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909840743",
        "tarjeta": "5579 1004 4542 8350",
        "clabeInterbancaria": "0140 2856 9098 407438"
      },
      {
        "nombre": "Lucia Elizabeth Figueroa Garcia",
        "salarioMensual": 2e4,
        "bonos": 4e3,
        "banco": "SANTANDER",
        "numeroCuenta": "56909814027",
        "tarjeta": "5579 1004 4544 7624",
        "clabeInterbancaria": "0140 2856 9098 140274"
      },
      {
        "nombre": "Luis Angel Arredondo Balderas",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1587574037",
        "tarjeta": "4152 3141 2354 8987",
        "clabeInterbancaria": "0120 2801 5875 740372"
      },
      {
        "nombre": "Luis Daniel Garcia Jaramillo",
        "salarioMensual": 18e3,
        "bonos": 2e3,
        "banco": "BANORTE",
        "numeroCuenta": null,
        "tarjeta": "4189 1400 5646 9074",
        "clabeInterbancaria": "0720 2801 3238 928841"
      },
      {
        "nombre": "Luis Daniel Garc\xEDa Jaramillo (Anabel Garc\xEDa)",
        "salarioMensual": 0,
        "bonos": 0,
        "banco": "BanCoppel",
        "numeroCuenta": null,
        "tarjeta": "4169 1606 1068 2974",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Mariana Guridi Amezquita",
        "salarioMensual": 16e3,
        "bonos": 0,
        "banco": "BANAMEX",
        "numeroCuenta": null,
        "tarjeta": "5256 7845 9188 7590",
        "clabeInterbancaria": "0020 2890 5437 897039"
      },
      {
        "nombre": "Mario Alberto Abrajan Ordorica",
        "salarioMensual": 18e3,
        "bonos": 1e3,
        "banco": "BBVA",
        "numeroCuenta": "1593452090",
        "tarjeta": null,
        "clabeInterbancaria": "0121 8001 5934 520902"
      },
      {
        "nombre": "Martha Concepcion Laguna Valdez",
        "salarioMensual": 15e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909834400",
        "tarjeta": "5579 1004 4542 8475",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Martin Mendez Pineda",
        "salarioMensual": 4e4,
        "bonos": 0,
        "banco": "BANCO AZTECA",
        "numeroCuenta": "44520100211169",
        "tarjeta": "4027 6658 4943 8842",
        "clabeInterbancaria": "1270 2800 1002 111699"
      },
      {
        "nombre": "Martinez Rubio Erik",
        "salarioMensual": 3e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1172397811",
        "tarjeta": "4152 3141 7919 7770",
        "clabeInterbancaria": "0120 2801 1723 978119"
      },
      {
        "nombre": "Natalia Camarena Hernandez",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1529820973",
        "tarjeta": "4152 3139 8531 1864",
        "clabeInterbancaria": "0121 8001 5298 209736"
      },
      {
        "nombre": "Nelson Emilio Saavedra Rivera",
        "salarioMensual": 25e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909840652",
        "tarjeta": "5579 1004 4545 9199",
        "clabeInterbancaria": "0140 2856 9098 406523"
      },
      {
        "nombre": "Octavio Zambrano Gonzalez",
        "salarioMensual": 2e4,
        "bonos": 1e3,
        "banco": "SANTANDER",
        "numeroCuenta": "56909829386",
        "tarjeta": "5579 1004 4545 6484",
        "clabeInterbancaria": "0140 2856 7781 431195"
      },
      {
        "nombre": "Oscar Daniel Madera Meraz",
        "salarioMensual": 15e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1536861977",
        "tarjeta": "4152 3138 0582 3254",
        "clabeInterbancaria": "0121 8001 5368 619777"
      },
      {
        "nombre": "Oscar Noe Segura Becerra",
        "salarioMensual": 14500,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": null,
        "tarjeta": "4152 3142 1477 8147",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Palacios Ramirez Abigail",
        "salarioMensual": 2e4,
        "bonos": 4093,
        "banco": "SANTANDER",
        "numeroCuenta": "56909828670",
        "tarjeta": "5579 1004 4545 6286",
        "clabeInterbancaria": "0140 2856 9098 286701"
      },
      {
        "nombre": "Pedro Esteban Barrios Sosa",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "IMBURSA",
        "numeroCuenta": null,
        "tarjeta": "4658 2850 2082 9788",
        "clabeInterbancaria": "0361 8050 0747 547773"
      },
      {
        "nombre": "Racso Sami Cabrera Hernandez",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": null,
        "tarjeta": "4152 3146 0298 2178",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Ricardo P\xE1ez Valadez",
        "salarioMensual": 15e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": null,
        "tarjeta": "4152 3143 5226 4215",
        "clabeInterbancaria": "0121 8001 5272 721531"
      },
      {
        "nombre": "Roberto Alonso Hernandez Pi\xF1a",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909809014",
        "tarjeta": "5579 1004 4544 4324",
        "clabeInterbancaria": "0140 2856 9098 090146"
      },
      {
        "nombre": "Sandra Solorio Luis",
        "salarioMensual": 15e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1576164644",
        "tarjeta": "4152 3145 0363 3714",
        "clabeInterbancaria": "0121 8001 5761 646444"
      },
      {
        "nombre": "Selene Sofia Dominguez Tellez",
        "salarioMensual": 2e4,
        "bonos": 4e3,
        "banco": "BBVA",
        "numeroCuenta": "1535247583",
        "tarjeta": "4152 3138 7928 9457",
        "clabeInterbancaria": "0121 8001 5352 475833"
      },
      {
        "nombre": "Suarez Nieto Jesus Alberto",
        "salarioMensual": 25e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909840726",
        "tarjeta": "5579 1004 4546 1500",
        "clabeInterbancaria": "0140 2856 9098 407263"
      },
      {
        "nombre": "Tellez Jimenez Noemi Isabel",
        "salarioMensual": 25e3,
        "bonos": 2e3,
        "banco": "SANTANDER",
        "numeroCuenta": "56879860318",
        "tarjeta": "5579 1004 1388 7579",
        "clabeInterbancaria": "0140 2856 8798 603180"
      },
      {
        "nombre": "Veronica Alejandra Dominguez Tellez",
        "salarioMensual": 2e4,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": "56909828011",
        "tarjeta": "5579 1004 4545 4794",
        "clabeInterbancaria": "0140 2856 9098 280118"
      },
      {
        "nombre": "Veronica Yomira S\xE1nchez Mart\xEDnez",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "SANTANDER",
        "numeroCuenta": null,
        "tarjeta": "5579 1004 6530 4218",
        "clabeInterbancaria": null
      },
      {
        "nombre": "Vizcarra Soto Elizabeth",
        "salarioMensual": 2e4,
        "bonos": 7e3,
        "banco": "SANTANDER",
        "numeroCuenta": "56879860105",
        "tarjeta": "5579 1004 1005 8505",
        "clabeInterbancaria": "0140 2856 8798 601056"
      },
      {
        "nombre": "Yahaira Rojas Mota",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "BBVA",
        "numeroCuenta": "1538996604",
        "tarjeta": null,
        "clabeInterbancaria": "0120 2801 5389 966040"
      },
      {
        "nombre": "Yair Martinez Cisneros",
        "salarioMensual": 18e3,
        "bonos": 0,
        "banco": "BANAMEX",
        "numeroCuenta": null,
        "tarjeta": "5204 1662 6022 0498",
        "clabeInterbancaria": "0020 2870 2218 759133"
      }
    ];
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
  getEmpleadosEliminados: () => getEmpleadosEliminados,
  getPeriodoById: () => getPeriodoById,
  getPeriodoDiasSeleccionados: () => getPeriodoDiasSeleccionados,
  getPeriodos: () => getPeriodos,
  getSabadosPeriodo: () => getSabadosPeriodo,
  getUserByOpenId: () => getUserByOpenId,
  insertarAsistencias: () => insertarAsistencias,
  recalcularDiasLaboradosPeriodo: () => recalcularDiasLaboradosPeriodo,
  renamePeriodo: () => renamePeriodo,
  restaurarEmpleado: () => restaurarEmpleado,
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
function normalizarClaveEmpleado(nombre) {
  return String(nombre ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
}
function tokensEmpleado(nombre) {
  return normalizarClaveEmpleado(nombre).split(" ").map((token) => token.trim()).filter((token) => token.length >= 3);
}
function esMismoEmpleadoProbable(nombreA, nombreB) {
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
  return comunes >= 2 && comunes === menor;
}
async function fusionarEmpleadoDuplicado(rawConn, conservarId, duplicadoId) {
  if (!conservarId || !duplicadoId || conservarId === duplicadoId) return;
  await rawConn.execute(
    `UPDATE asistencias SET empleado_id = ? WHERE empleado_id = ?`,
    [conservarId, duplicadoId]
  );
  await rawConn.execute(
    `DELETE a1 FROM asistencias a1
     INNER JOIN asistencias a2
       ON a2.empleado_id = a1.empleado_id
      AND a2.periodo_id = a1.periodo_id
      AND a2.fecha = a1.fecha
      AND a2.id < a1.id
     WHERE a1.empleado_id = ?`,
    [conservarId]
  );
  await rawConn.execute(
    `UPDATE calculos_nomina cn
     LEFT JOIN calculos_nomina existente
       ON existente.empleado_id = ?
      AND existente.periodo_id = cn.periodo_id
      AND existente.id <> cn.id
     SET cn.empleado_id = CASE WHEN existente.id IS NULL THEN ? ELSE cn.empleado_id END
     WHERE cn.empleado_id = ?`,
    [conservarId, conservarId, duplicadoId]
  );
  await rawConn.execute(
    `DELETE cn FROM calculos_nomina cn
     INNER JOIN calculos_nomina conservar
       ON conservar.empleado_id = ?
      AND conservar.periodo_id = cn.periodo_id
      AND conservar.id <> cn.id
     WHERE cn.empleado_id = ?`,
    [conservarId, duplicadoId]
  );
  await rawConn.execute(
    `UPDATE empleados SET activo = false, nombre = CONCAT(nombre, ' (duplicado fusionado)') WHERE id = ?`,
    [duplicadoId]
  );
}
async function deduplicarEmpleadosPorNombre(rawConn) {
  const [rows] = await rawConn.execute(
    `SELECT id, nombre, banco, numero_cuenta, tarjeta, clabe_interbancaria FROM empleados WHERE activo = true ORDER BY id ASC`
  );
  const empleadosLista = rows ?? [];
  const fusionados = /* @__PURE__ */ new Set();
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
    if (!await columnExists(rawConn, "empleados", "departamento_id")) {
      await rawConn.execute(`ALTER TABLE empleados ADD departamento_id int NULL`);
    }
    if (!await columnExists(rawConn, "empleados", "notas")) {
      await rawConn.execute(`ALTER TABLE empleados ADD notas text NULL AFTER departamento_id`);
    }
    if (!await columnExists(rawConn, "empleados", "banco")) {
      await rawConn.execute(`ALTER TABLE empleados ADD banco varchar(120) NULL AFTER notas`);
    }
    if (!await columnExists(rawConn, "empleados", "numero_cuenta")) {
      await rawConn.execute(`ALTER TABLE empleados ADD numero_cuenta varchar(80) NULL AFTER banco`);
    }
    if (!await columnExists(rawConn, "empleados", "tarjeta")) {
      await rawConn.execute(`ALTER TABLE empleados ADD tarjeta varchar(80) NULL AFTER numero_cuenta`);
    }
    if (!await columnExists(rawConn, "empleados", "clabe_interbancaria")) {
      await rawConn.execute(`ALTER TABLE empleados ADD clabe_interbancaria varchar(80) NULL AFTER tarjeta`);
    }
    if (!await columnExists(rawConn, "periodos", "dias_seleccionados")) {
      await rawConn.execute(`ALTER TABLE periodos ADD dias_seleccionados json NULL`);
    }
    if (!await columnExists(rawConn, "asistencias", "salida_comida")) {
      await rawConn.execute(`ALTER TABLE asistencias ADD salida_comida varchar(20) NULL AFTER entrada`);
    }
    if (!await columnExists(rawConn, "asistencias", "entrada_comida")) {
      await rawConn.execute(`ALTER TABLE asistencias ADD entrada_comida varchar(20) NULL AFTER salida_comida`);
    }
    for (const nombre of DEPARTAMENTOS_INICIALES) {
      await rawConn.execute(
        `INSERT INTO departamentos (nombre, activo) VALUES (?, true)
         ON DUPLICATE KEY UPDATE activo = true`,
        [nombre]
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
        emp.clabeInterbancaria ? String(emp.clabeInterbancaria) : null
      ];
      const [empleadosExistentesActuales] = await rawConn.execute(
        `SELECT id, nombre FROM empleados WHERE activo = true ORDER BY id ASC`
      );
      const existente = (empleadosExistentesActuales ?? []).find(
        (actual) => esMismoEmpleadoProbable(actual.nombre, emp.nombre)
      );
      if (existente) {
        await rawConn.execute(
          `UPDATE empleados
           SET nombre = ?, salario_mensual = ?, bonos = ?, banco = ?, numero_cuenta = ?, tarjeta = ?, clabe_interbancaria = ?, activo = true
           WHERE id = ?`,
          [...valores, existente.id]
        );
      } else {
        await rawConn.execute(
          `INSERT INTO empleados (nombre, salario_mensual, bonos, banco, numero_cuenta, tarjeta, clabe_interbancaria, activo)
           VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
          valores
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
async function getEmpleados(periodoId, incluirInactivos = false) {
  const db = await getDb();
  if (!db) return [];
  const rawConn = await getRawConnection();
  const selectedDays = periodoId ? await getPeriodoDiasSeleccionados(periodoId) : null;
  const selected = buildSelectedDaysCondition("a", selectedDays);
  const periodoJoin = periodoId ? "AND a.periodo_id = ?" : "AND a.periodo_id = (SELECT MAX(id) FROM periodos)";
  const periodoParams = periodoId ? [periodoId] : [];
  const diasLaboradosSelect = `e.dias_laborados AS diasLaborados`;
  const diasLaboradosParams = [];
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
      e.bonos,
      ${diasLaboradosSelect},
      e.descuentos_adicionales AS descuentosAdicionales,
      e.activo,
      e.createdAt,
      e.updatedAt,
      COALESCE(COUNT(DISTINCT CASE WHEN a.es_falta = 1 THEN a.fecha END), 0) as dias_falta_periodo
    FROM empleados e
    LEFT JOIN departamentos d ON d.id = e.departamento_id
    LEFT JOIN asistencias a ON a.empleado_id = e.id ${periodoJoin}${selected.sql}
    WHERE ${incluirInactivos ? "1=1" : "e.activo = 1"}
    GROUP BY e.id, e.nombre, e.departamento_id, d.nombre, e.notas, e.banco, e.numero_cuenta, e.tarjeta, e.clabe_interbancaria, e.salario_mensual, e.bonos, e.dias_laborados, e.descuentos_adicionales, e.activo, e.createdAt, e.updatedAt
    ORDER BY e.nombre
  `, [...diasLaboradosParams, ...periodoParams, ...selected.params]);
  await rawConn.end();
  return rows;
}
async function getEmpleadosEliminados() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
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
    descuentosAdicionales: empleados.descuentosAdicionales,
    activo: empleados.activo,
    createdAt: empleados.createdAt,
    updatedAt: empleados.updatedAt
  }).from(empleados).leftJoin(departamentos, eq(departamentos.id, empleados.departamentoId)).where(eq(empleados.activo, false)).orderBy(desc(empleados.updatedAt));
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
async function restaurarEmpleado(id) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  return db.update(empleados).set({ activo: true }).where(eq(empleados.id, id));
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
    const setSql = input.estado === "asistencia" ? `es_falta = 0, es_descanso = 0, entrada = 'Asistencia', salida_comida = 'Asistencia', entrada_comida = 'Asistencia', salida = 'Asistencia'` : input.estado === "falta" ? `es_falta = 1, es_descanso = 0, entrada = NULL, salida_comida = NULL, entrada_comida = NULL, salida = NULL` : `es_falta = 0, es_descanso = 1, entrada = NULL, salida_comida = NULL, entrada_comida = NULL, salida = NULL`;
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
    init_catalogoNomina();
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
  if (req.secure || req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedSsl = req.headers["x-forwarded-ssl"];
  const forwarded = req.headers["forwarded"];
  if (typeof forwardedSsl === "string" && forwardedSsl.toLowerCase() === "on") {
    return true;
  }
  if (forwardedProto) {
    const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
    if (protoList.some((proto) => proto.trim().toLowerCase() === "https")) {
      return true;
    }
  }
  if (typeof forwarded === "string") {
    return forwarded.toLowerCase().split(",").some((part) => part.includes("proto=https"));
  }
  return false;
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure
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
var reportesProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin" && ctx.user.role !== "reportes") {
      throw new TRPCError2({ code: "FORBIDDEN", message: "No tienes permisos para esta acci\xF3n" });
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
  const regex = /(\d{1,2}):(\d{2})(am|pm)/gi;
  const resultados = [];
  let matchResult;
  while ((matchResult = regex.exec(lineaSinFecha)) !== null) {
    const valor = `${matchResult[1]}:${matchResult[2]}${matchResult[3]}`;
    resultados.push(convertirHora12(valor));
  }
  return resultados;
}
function asignarMarcasDia(dia, valores) {
  dia.entrada = valores[0] || null;
  if (valores.length >= 4) {
    dia.salidaComida = valores[1] || null;
    dia.entradaComida = valores[2] || null;
    dia.salida = valores[3] || null;
  } else if (valores.length === 3) {
    dia.salidaComida = valores[1] || null;
    dia.entradaComida = null;
    dia.salida = valores[2] || null;
  } else {
    dia.salidaComida = null;
    dia.entradaComida = null;
    dia.salida = valores[1] || null;
  }
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
        asignarMarcasDia(diaActual, horasAcumuladas);
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
          salidaComida: null,
          entradaComida: null,
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
          salidaComida: null,
          entradaComida: null,
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
function esNombreNoIdentificado(nombre) {
  const normalizado = String(nombre ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return !normalizado || ["desconocido", "unknown", "sin nombre", "sin identificar"].includes(normalizado);
}
function nombreEmpleadoParaReporte(emp, empleadoId) {
  if (!emp) return `Empleado eliminado #${empleadoId}`;
  if (esNombreNoIdentificado(emp.nombre)) return `Empleado sin identificar #${empleadoId}`;
  return emp.nombre;
}
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
    listEliminados: publicProcedure.query(async () => {
      return getEmpleadosEliminados();
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getEmpleadoById(input.id);
    }),
    create: adminProcedure.input(
      z2.object({
        nombre: z2.string().min(1),
        salarioMensual: z2.number().min(0),
        bonos: z2.number().min(0).default(0),
        departamentoId: z2.number().nullable().optional(),
        notas: z2.string().max(1e4).nullable().optional(),
        banco: z2.string().max(120).nullable().optional(),
        numeroCuenta: z2.string().max(80).nullable().optional(),
        tarjeta: z2.string().max(80).nullable().optional(),
        clabeInterbancaria: z2.string().max(80).nullable().optional()
      })
    ).mutation(async ({ input }) => {
      await crearEmpleado({
        nombre: input.nombre,
        salarioMensual: input.salarioMensual.toFixed(2),
        bonos: input.bonos.toFixed(2),
        departamentoId: input.departamentoId ?? null,
        notas: input.notas?.trim() || null,
        banco: input.banco?.trim().toUpperCase() || null,
        numeroCuenta: input.numeroCuenta?.trim() || null,
        tarjeta: input.tarjeta?.trim() || null,
        clabeInterbancaria: input.clabeInterbancaria?.trim() || null
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
        departamentoId: z2.number().nullable().optional(),
        notas: z2.string().max(1e4).nullable().optional(),
        banco: z2.string().max(120).nullable().optional(),
        numeroCuenta: z2.string().max(80).nullable().optional(),
        tarjeta: z2.string().max(80).nullable().optional(),
        clabeInterbancaria: z2.string().max(80).nullable().optional()
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
      if (data.notas !== void 0) updateData.notas = data.notas?.trim() || null;
      if (data.banco !== void 0) updateData.banco = data.banco?.trim().toUpperCase() || null;
      if (data.numeroCuenta !== void 0) updateData.numeroCuenta = data.numeroCuenta?.trim() || null;
      if (data.tarjeta !== void 0) updateData.tarjeta = data.tarjeta?.trim() || null;
      if (data.clabeInterbancaria !== void 0) updateData.clabeInterbancaria = data.clabeInterbancaria?.trim() || null;
      await actualizarEmpleado(id, updateData);
      return { success: true };
    }),
    delete: adminProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await eliminarEmpleado(input.id);
      return { success: true };
    }),
    restore: adminProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await restaurarEmpleado(input.id);
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
    procesarArchivo: reportesProcedure.input(
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
      function normalizarNombre(s) {
        return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
      }
      const empleadosMap = new Map(empleadosDB.map((e) => [normalizarNombre(e.nombre), e]));
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
      const empleadosNoRegistrados = [];
      for (const empParsed of empleadosParsed) {
        let empleadoDB = empleadosMap.get(normalizarNombre(empParsed.nombre));
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
          if (!empleadosNoRegistrados.includes(empParsed.nombre)) {
            empleadosNoRegistrados.push(empParsed.nombre);
          }
          continue;
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
          salidaComida: r.salidaComida,
          entradaComida: r.entradaComida,
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
        empleadosNoRegistrados,
        resultados
      };
    }),
    getReportePeriodo: publicProcedure.input(z2.object({ periodoId: z2.number() })).query(async ({ input, ctx }) => {
      const periodo = await getPeriodoById(input.periodoId);
      if (!periodo) throw new Error("Per\xEDodo no encontrado");
      const asistenciasTodas = await getAsistenciasByPeriodo(input.periodoId);
      const diasPeriodo = await getDiasPeriodo(input.periodoId);
      const diasSeleccionados = await getPeriodoDiasSeleccionados(input.periodoId);
      const diasActivos = diasSeleccionados && diasSeleccionados.length > 0 ? diasSeleccionados : diasPeriodo;
      const diasActivosSet = new Set(diasActivos);
      const asistenciasDB = asistenciasTodas.filter((a) => diasActivosSet.has(a.fecha));
      const empleadosDB = await getEmpleados(input.periodoId, true);
      const empleadosMap = new Map(empleadosDB.map((e) => [e.id, e]));
      const ocultarMontos = ctx.user?.role === "reportes";
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
          descuento: ocultarMontos ? null : descuento.toFixed(2),
          salarioAPagar: ocultarMontos ? null : Math.max(0, salarioAPagar).toFixed(2),
          empleadoNombre: nombreEmpleadoParaReporte(emp, empleadoId),
          nombreOriginal: emp?.nombre ?? null,
          requiereRevisionNombre: !emp || esNombreNoIdentificado(emp?.nombre),
          departamentoId: emp?.departamentoId ?? null,
          departamentoNombre: emp?.departamentoNombre ?? null,
          notas: emp?.notas ?? null,
          salarioMensual: ocultarMontos ? null : salario,
          bonos: ocultarMontos ? null : bonos,
          asistencias: asistenciasOrdenadas
        };
      });
      const empleadosCriticos = calculos.filter((c) => c.diasFalta >= 3).sort((a, b) => b.diasFalta - a.diasFalta);
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
        empleadosCriticos
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
      role: z2.enum(["user", "admin", "reportes"])
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
function formatCurrency(n) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
function formatFecha(fecha) {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [y, m, d] = fecha.split("-");
  return `${d} ${meses[parseInt(m) - 1]} ${y}`;
}
function esNombreNoIdentificado2(nombre) {
  const normalizado = String(nombre ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return !normalizado || ["desconocido", "unknown", "sin nombre", "sin identificar"].includes(normalizado);
}
function nombreEmpleadoParaReporte2(emp, empleadoId) {
  if (!emp) return `Empleado eliminado #${empleadoId}`;
  if (esNombreNoIdentificado2(emp.nombre)) return `Empleado sin identificar #${empleadoId}`;
  return emp.nombre;
}
async function getReporteData(periodoId) {
  const periodo = await getPeriodoById(periodoId);
  if (!periodo) throw new Error("Per\xEDodo no encontrado");
  const todosEmpleados = await getEmpleados(periodoId, true);
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
      empleadoNombre: nombreEmpleadoParaReporte2(emp, c.empleadoId),
      nombreOriginal: emp?.nombre ?? null,
      requiereRevisionNombre: !emp || esNombreNoIdentificado2(emp?.nombre),
      departamentoId: emp?.departamentoId ?? null,
      departamentoNombre: emp?.departamentoNombre ?? null,
      notas: emp?.notas ?? null,
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
var defaultPDFOptions = {
  departamentoId: null,
  tipoRegistros: "todos",
  includeResumen: true,
  includeTotalEmpleados: true,
  includePromedioAsistencia: true,
  includeTotalDescuentos: true,
  includeTotalNomina: true,
  includeSalario: true,
  includeBonos: true,
  includeDescuento: true,
  includeSalarioPagar: true,
  includeAsistidos: true,
  includeFaltas: true,
  includeTablaDias: true,
  includeEntrada: true,
  includeSalidaComida: true,
  includeEntradaComida: true,
  includeSalida: true,
  includeColumnaFaltas: true,
  diasSeleccionados: []
};
async function generarPDF(periodoId, options = {}) {
  const { periodo, calculos } = await getReporteData(periodoId);
  const pdfOptions = { ...defaultPDFOptions, ...options };
  const diasFiltro = Array.isArray(pdfOptions.diasSeleccionados) && pdfOptions.diasSeleccionados.length > 0 ? new Set(pdfOptions.diasSeleccionados) : null;
  const calculosFiltrados = calculos.filter((c) => pdfOptions.departamentoId == null || Number(c.departamentoId) === Number(pdfOptions.departamentoId)).map((c) => ({
    ...c,
    asistencias: (c.asistencias ?? []).filter((a) => {
      if (diasFiltro && !diasFiltro.has(a.fecha)) return false;
      if (pdfOptions.tipoRegistros === "faltas") return a.esFalta && !a.esDescanso;
      if (pdfOptions.tipoRegistros === "descansos") return a.esDescanso;
      if (pdfOptions.tipoRegistros === "asistencias") return !a.esFalta && !a.esDescanso;
      return true;
    })
  })).map((c) => {
    const diasLaborables = (c.asistencias ?? []).filter((a) => !a.esDescanso && !esDomingo(a.fecha)).length;
    const diasFalta = (c.asistencias ?? []).filter((a) => a.esFalta && !a.esDescanso && !esDomingo(a.fecha)).length;
    const diasAsistidos = (c.asistencias ?? []).filter((a) => !a.esFalta && !a.esDescanso && !esDomingo(a.fecha)).length;
    const descuento = calcularDescuento(c.salarioMensual, diasFalta);
    const salarioAPagar = calcularSalarioAPagar(c.salarioMensual, diasLaborables, c.bonos, descuento);
    return { ...c, diasLaborables, diasFalta, diasAsistidos, descuento, salarioAPagar };
  }).filter((c) => pdfOptions.tipoRegistros === "todos" || c.asistencias.length > 0);
  const departamentoSeleccionado = pdfOptions.departamentoId == null ? null : calculos.find((c) => Number(c.departamentoId) === Number(pdfOptions.departamentoId))?.departamentoNombre;
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
    const filtrosAplicados = [
      departamentoSeleccionado ? `Departamento: ${departamentoSeleccionado}` : null,
      pdfOptions.tipoRegistros !== "todos" ? `Registros: ${pdfOptions.tipoRegistros}` : null,
      diasFiltro ? `D\xEDas seleccionados: ${diasFiltro.size}` : null
    ].filter(Boolean).join(" \xB7 ");
    if (filtrosAplicados) {
      doc.fontSize(9).text(filtrosAplicados, 50, 104, { width: W });
    }
    const totalNomina = calculosFiltrados.reduce((s, c) => s + c.salarioAPagar, 0);
    const totalDescuentos = calculosFiltrados.reduce((s, c) => s + c.descuento, 0);
    const promedioAsistencia = calculosFiltrados.length > 0 ? calculosFiltrados.reduce((s, c) => s + (c.diasLaborables > 0 ? c.diasAsistidos / c.diasLaborables * 100 : 0), 0) / calculosFiltrados.length : 0;
    const stats = [
      pdfOptions.includeTotalEmpleados ? ["Total Empleados", String(calculosFiltrados.length)] : null,
      pdfOptions.includePromedioAsistencia ? ["Promedio Asistencia", `${promedioAsistencia.toFixed(1)}%`] : null,
      pdfOptions.includeTotalDescuentos ? ["Total Descuentos", formatCurrency(totalDescuentos)] : null,
      pdfOptions.includeTotalNomina ? ["Total N\xF3mina a Pagar", formatCurrency(totalNomina)] : null
    ].filter(Boolean);
    let y = 140;
    if (pdfOptions.includeResumen && stats.length > 0) {
      doc.fillColor(NAVY).fontSize(14).font("Helvetica-Bold").text("Resumen Ejecutivo", 50, y);
      doc.moveTo(50, y + 18).lineTo(545, y + 18).strokeColor(NAVY).lineWidth(1.5).stroke();
      let sx = 50;
      const sy = y + 28;
      const gap = 5;
      const sw = (W - gap * (stats.length - 1)) / stats.length;
      for (const [label, val] of stats) {
        doc.rect(sx, sy, sw, 52).fill(LIGHT_GRAY);
        doc.fillColor(GRAY).fontSize(8).font("Helvetica").text(label, sx + 8, sy + 8, { width: sw - 16 });
        doc.fillColor(NAVY).fontSize(13).font("Helvetica-Bold").text(val, sx + 8, sy + 22, { width: sw - 16 });
        sx += sw + gap;
      }
      y = sy + 72;
    }
    if (calculosFiltrados.length === 0) {
      doc.fillColor(GRAY).fontSize(11).font("Helvetica").text("No hay empleados o registros que coincidan con los filtros seleccionados.", 50, y, { width: W });
      doc.end();
      return;
    }
    const tableColumns = [
      { key: "fecha", header: "FECHA", width: 95 },
      ...pdfOptions.includeEntrada ? [{ key: "entrada", header: "ENTRADA LAB.", width: 82 }] : [],
      ...pdfOptions.includeSalidaComida ? [{ key: "salidaComida", header: "SALIDA COM.", width: 82 }] : [],
      ...pdfOptions.includeEntradaComida ? [{ key: "entradaComida", header: "ENTRADA COM.", width: 82 }] : [],
      ...pdfOptions.includeSalida ? [{ key: "salida", header: "SALIDA LAB.", width: 82 }] : [],
      ...pdfOptions.includeColumnaFaltas ? [{ key: "faltas", header: "FALTAS", width: 55 }] : []
    ];
    const totalColWidth = tableColumns.reduce((sum, col) => sum + col.width, 0);
    const colX = [];
    let runningX = 50 + Math.max(0, (W - totalColWidth) / 2);
    for (const col of tableColumns) {
      colX.push(runningX);
      runningX += col.width;
    }
    for (const emp of calculosFiltrados) {
      const rowsNeeded = emp.asistencias.length;
      const notasTexto = String(emp.notas ?? "").trim();
      const notasExtra = notasTexto ? Math.min(90, Math.max(34, Math.ceil(notasTexto.length / 95) * 12 + 22)) : 0;
      const spaceNeeded = 80 + notasExtra + rowsNeeded * 18 + 40;
      if (y + spaceNeeded > 780) {
        doc.addPage();
        y = 50;
      }
      doc.rect(50, y, W, 28).fill(NAVY);
      doc.fillColor(WHITE).fontSize(11).font("Helvetica-Bold").text(emp.empleadoNombre, 58, y + 8, { width: W - 16 });
      y += 28;
      const resumenPartes = [
        emp.departamentoNombre ? `Depto: ${emp.departamentoNombre}` : null,
        pdfOptions.includeSalario ? `Salario: ${formatCurrency(emp.salarioMensual)}` : null,
        pdfOptions.includeBonos ? `Bonos: ${formatCurrency(emp.bonos)}` : null,
        pdfOptions.includeDescuento ? `Descuento: ${formatCurrency(emp.descuento)}` : null,
        pdfOptions.includeSalarioPagar ? `A Pagar: ${formatCurrency(emp.salarioAPagar)}` : null,
        pdfOptions.includeAsistidos ? `Asistidos: ${emp.diasAsistidos}/${emp.diasLaborables}` : null,
        pdfOptions.includeFaltas ? `Faltas: ${emp.diasFalta}` : null
      ].filter(Boolean).join("   ");
      if (resumenPartes) {
        doc.rect(50, y, W, 20).fill(LIGHT_GRAY);
        doc.fillColor(GRAY).fontSize(8).font("Helvetica").text(resumenPartes, 58, y + 6, { width: W - 16 });
        y += 20;
      }
      if (notasTexto) {
        const noteHeight = Math.min(110, Math.max(34, doc.heightOfString(notasTexto, { width: W - 32 }) + 24));
        if (y + noteHeight > 780) {
          doc.addPage();
          y = 50;
        }
        doc.rect(50, y, W, noteHeight).fill("#fffbeb").strokeColor("#f6d365").lineWidth(0.5).stroke();
        doc.fillColor(NAVY).fontSize(8.5).font("Helvetica-Bold").text("NOTAS", 58, y + 8, { width: W - 16 });
        doc.fillColor("#3f3f46").fontSize(8).font("Helvetica").text(notasTexto, 58, y + 20, {
          width: W - 16,
          height: noteHeight - 24,
          ellipsis: true
        });
        y += noteHeight + 8;
      }
      if (!pdfOptions.includeTablaDias) {
        y += 16;
        continue;
      }
      doc.rect(50, y, W, 18).fill(NAVY_LIGHT);
      for (let i = 0; i < tableColumns.length; i++) {
        doc.fillColor(WHITE).fontSize(7.5).font("Helvetica-Bold").text(tableColumns[i].header, colX[i], y + 5, { width: tableColumns[i].width, align: "center" });
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
          for (let i = 0; i < tableColumns.length; i++) {
            doc.fillColor(WHITE).fontSize(7.5).font("Helvetica-Bold").text(tableColumns[i].header, colX[i], y + 5, { width: tableColumns[i].width, align: "center" });
          }
          y += 18;
        }
        const rowBg = isFalta ? RED_BG : ri % 2 === 0 ? WHITE : LIGHT_GRAY;
        doc.rect(50, y, W, rowH).fill(rowBg);
        const textColor = isFalta ? RED : NAVY;
        doc.fillColor(textColor).fontSize(8).font(isFalta ? "Helvetica-Bold" : "Helvetica");
        tableColumns.forEach((col, i) => {
          if (col.key === "fecha") {
            doc.fillColor(textColor).font(isFalta ? "Helvetica-Bold" : "Helvetica").text(formatFecha(a.fecha), colX[i], y + 4, { width: col.width, align: "center" });
          } else if (col.key === "entrada") {
            doc.fillColor(textColor).font(isFalta ? "Helvetica-Bold" : "Helvetica").text(isDescanso ? "Descanso" : a.entrada || "\u2014", colX[i], y + 4, { width: col.width, align: "center" });
          } else if (col.key === "salidaComida") {
            doc.fillColor(textColor).font(isFalta ? "Helvetica-Bold" : "Helvetica").text(isDescanso ? "Descanso" : a.salidaComida || "\u2014", colX[i], y + 4, { width: col.width, align: "center" });
          } else if (col.key === "entradaComida") {
            doc.fillColor(textColor).font(isFalta ? "Helvetica-Bold" : "Helvetica").text(isDescanso ? "Descanso" : a.entradaComida || "\u2014", colX[i], y + 4, { width: col.width, align: "center" });
          } else if (col.key === "salida") {
            doc.fillColor(textColor).font(isFalta ? "Helvetica-Bold" : "Helvetica").text(isDescanso ? "Descanso" : a.salida || "\u2014", colX[i], y + 4, { width: col.width, align: "center" });
          } else if (col.key === "faltas") {
            if (isDescanso) {
              doc.fillColor(GRAY).font("Helvetica").text("\u2014", colX[i], y + 4, { width: col.width, align: "center" });
            } else if (isFalta) {
              doc.fillColor(RED).font("Helvetica-Bold").text("S\xCD", colX[i], y + 4, { width: col.width, align: "center" });
            } else {
              doc.fillColor(GREEN).font("Helvetica").text("NO", colX[i], y + 4, { width: col.width, align: "center" });
            }
          }
        });
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
    { header: "Salario a Pagar", key: "salarioPagar", width: 18 },
    { header: "Notas", key: "notas", width: 48 }
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
      salarioPagar: c.salarioAPagar,
      notas: c.notas || ""
    });
    const bg = i % 2 === 0 ? "FFF7FAFC" : "FFFFFFFF";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.alignment = { vertical: "middle", wrapText: true };
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
    ws.mergeCells("A1:F1");
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
    if (String(emp.notas ?? "").trim()) {
      ws.mergeCells("A5:F5");
      ws.getCell("A5").value = `Notas: ${String(emp.notas).trim()}`;
      ws.getCell("A5").alignment = { wrapText: true, vertical: "top" };
      ws.getCell("A5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
      ws.getCell("A5").font = { color: { argb: "FF3f3f46" } };
      ws.getRow(5).height = Math.min(80, Math.max(24, Math.ceil(String(emp.notas).length / 90) * 16));
    }
    ws.columns = [
      { key: "fecha", width: 18 },
      { key: "entrada", width: 18 },
      { key: "salidaComida", width: 18 },
      { key: "entradaComida", width: 18 },
      { key: "salida", width: 18 },
      { key: "falta", width: 10 }
    ];
    const tHeaderRow = ws.getRow(6);
    tHeaderRow.values = ["FECHA", "ENTRADA LABORAL", "SALIDA COMIDA", "ENTRADA COMIDA", "SALIDA LABORAL", "FALTAS"];
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
        isDescanso ? "\u2014" : a.salidaComida || "\u2014",
        isDescanso ? "\u2014" : a.entradaComida || "\u2014",
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
  app.set("trust proxy", true);
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
      const user = await sdk.authenticateRequest(req);
      const ocultarMontos = user.role === "reportes";
      const periodoId = parseInt(req.params.periodoId);
      const boolParam = (value, fallback = true) => value === void 0 ? fallback : String(value) === "true";
      const departamentoRaw = req.query.departamentoId;
      const diasRaw = req.query.diasSeleccionados;
      const diasSeleccionados = typeof diasRaw === "string" && diasRaw.trim().length > 0 ? diasRaw.split(",").map((d) => d.trim()).filter(Boolean) : [];
      const buffer = await generarPDF(periodoId, {
        departamentoId: departamentoRaw && departamentoRaw !== "todos" ? parseInt(String(departamentoRaw), 10) : null,
        tipoRegistros: ["todos", "asistencias", "faltas", "descansos"].includes(String(req.query.tipoRegistros)) ? String(req.query.tipoRegistros) : "todos",
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
        diasSeleccionados
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Reporte_${periodoId}.pdf"`);
      res.send(buffer);
    } catch (e) {
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
