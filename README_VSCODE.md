# Sistema de Gestión de Asistencias y Nómina

Aplicación web empresarial para procesar reportes de reloj checador, calcular descuentos por faltas y generar nómina.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + TailwindCSS 4 |
| Backend | Node.js + Express + tRPC 11 |
| Base de Datos | MySQL |
| ORM | Drizzle ORM |
| Pruebas | Vitest |

---

## Requisitos Previos

Antes de correr el proyecto en tu máquina local necesitas tener instalado:

- **Node.js** v18 o superior → https://nodejs.org
- **pnpm** → `npm install -g pnpm`
- **MySQL** v8.0 o superior → https://dev.mysql.com/downloads/

---

## Configuración Inicial

### 1. Clonar / Descargar el proyecto

Descarga el ZIP desde el panel de Manus y descomprímelo, o clona el repositorio si lo exportaste a GitHub.

```bash
cd proyecto_asistencias
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Base de datos MySQL
DATABASE_URL=mysql://root:TU_PASSWORD@localhost:3306/asistencias_db

# Seguridad
JWT_SECRET=tu_secreto_muy_seguro_aqui_cambialo

# OAuth (puedes dejar estos valores para desarrollo local)
VITE_APP_ID=local-dev
OAUTH_SERVER_URL=http://localhost:3000
VITE_OAUTH_PORTAL_URL=http://localhost:3000
OWNER_OPEN_ID=admin
OWNER_NAME=Administrador
```

### 4. Crear la base de datos en MySQL

```sql
CREATE DATABASE asistencias_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Ejecutar migraciones

```bash
pnpm drizzle-kit migrate
```

### 6. Iniciar el servidor de desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en: **http://localhost:3000**

---

## Estructura del Proyecto

```
proyecto_asistencias/
├── client/                    # Frontend React
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx      # Estadísticas generales
│       │   ├── Empleados.tsx      # Gestión de empleados
│       │   ├── CargarReporte.tsx  # Subir archivo TXT
│       │   ├── Reportes.tsx       # Lista de reportes
│       │   └── ReporteDetalle.tsx # Detalle con tabla de asistencias
│       └── components/
│           └── DashboardLayout.tsx # Layout con navegación
├── server/
│   ├── parser.ts              # Parser del archivo TXT del reloj checador
│   ├── parser.test.ts         # Pruebas unitarias del parser
│   ├── db.ts                  # Helpers de base de datos
│   ├── routers.ts             # Procedimientos tRPC (API)
│   └── exportar.ts            # Exportación a PDF y Excel
├── drizzle/
│   └── schema.ts              # Esquema de la base de datos
└── README_VSCODE.md           # Este archivo
```

---

## Funcionalidades

### 1. Gestión de Empleados
- Crear, editar y listar empleados
- Campos: nombre, salario mensual, bonos

### 2. Cargar Reporte TXT
- Sube el archivo del reloj checador VERTIKAL
- El sistema parsea automáticamente las asistencias
- **Regla crítica**: cualquier línea con "Falta" = falta obligatoria

### 3. Tabla de Asistencias
- Columnas: FECHA | ENTRADA | SALIDA | FALTAS
- Filas de falta resaltadas en **rojo**
- Resumen del período por empleado

### 4. Cálculo de Nómina
- **Descuento**: `(Salario / 30) × Días_Faltados`
- **Salario a pagar**: `(Salario / 30) × Días_Laborables + Bonos - Descuentos`
- Los domingos NO se cuentan como días laborables

### 5. Exportación
- **PDF**: Reporte profesional empresarial
- **Excel (XLSX)**: Datos completos para análisis

---

## Scripts Disponibles

```bash
pnpm dev          # Servidor de desarrollo
pnpm build        # Build de producción
pnpm test         # Ejecutar pruebas unitarias
pnpm check        # Verificar tipos TypeScript
pnpm drizzle-kit generate  # Generar migración después de cambiar schema
pnpm drizzle-kit migrate   # Aplicar migraciones pendientes
```

---

## Extensiones Recomendadas para VS Code

Instala estas extensiones para mejor experiencia de desarrollo:

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **TypeScript** (incluido en VS Code)
- **MySQL** (`cweijan.vscode-mysql-client2`)

---

## Agregar Nuevas Funcionalidades

El proyecto sigue el patrón **tRPC**:

1. Edita `drizzle/schema.ts` para agregar tablas
2. Ejecuta `pnpm drizzle-kit generate` y luego `pnpm drizzle-kit migrate`
3. Agrega helpers en `server/db.ts`
4. Agrega procedimientos en `server/routers.ts`
5. Consume desde el frontend con `trpc.*.useQuery/useMutation`

---

## Soporte

Si tienes problemas con la configuración, revisa:
- Que MySQL esté corriendo en el puerto 3306
- Que el `DATABASE_URL` en `.env` tenga las credenciales correctas
- Que la base de datos `asistencias_db` exista
