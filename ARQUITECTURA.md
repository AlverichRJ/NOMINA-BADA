# ARQUITECTURA DEL SISTEMA BADABUN

> **Pega este archivo al inicio de cada chat nuevo para orientar al asistente.**

---

## Reglas de trabajo (OBLIGATORIAS)

1. **Nunca subas código desde Manus al repo** — solo edita archivos en GitHub directamente con `gh` CLI
2. **Nunca subas `dist/index.js` compilado desde Manus** — tiene código de Manus OAuth/APIs que rompe el servidor
3. **Nunca toques archivos de autenticación del servidor**: `oauth.ts`, `sdk.ts`, `env.ts`, `const.ts`
4. **Solo modifica archivos fuente** (`.tsx`, `.ts`, `.css`) — el servidor compila con su propio `pnpm build`
5. **Antes de cada cambio confirma** que no contiene claves de Manus ni código que dependa de infraestructura de Manus

## Flujo de trabajo con GitHub

```
1. Usuario pide un cambio
2. Asistente edita el archivo directamente en /tmp/NOMINA-BADA/ (repo clonado)
3. Asistente hace commit y push al repo AlverichRJ/NOMINA-BADA
4. Usuario ejecuta en el servidor:
   cd /var/www/asistencias
   git pull origin main          # Si hay conflictos: git checkout -- <archivo> primero
   pnpm build
   pm2 restart asistencias
5. Usuario hace commit final desde el servidor si hay cambios locales adicionales
```

---

## Servidor de producción

- **Dominio:** `http://badabun.ddns.net`
- **OS:** Ubuntu Server
- **Usuario:** `arj`
- **Directorio:** `/var/www/asistencias/`
- **Process manager:** PM2 (`pm2 restart asistencias`)
- **Proxy:** Nginx en puerto 80 → Node.js en puerto 3000
- **Logs PM2:** `/home/arj/.pm2/logs/asistencias-error-0.log`
- **Logs Nginx:** `/var/log/nginx/asistencias_access.log`

---

## Stack tecnológico (Sistema de Nómina)

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express |
| API | tRPC |
| Base de datos | MySQL (schema: `badabun_nomina`) |
| Auth | Google OAuth 2.0 (Passport.js) |
| Deploy | PM2 + Nginx |
| Repo | `AlverichRJ/NOMINA-BADA` |

---

## Puertos del servidor

| Sistema | Frontend | Backend | Estado |
|---|---|---|---|
| Nómina | 3000 | — (monolito) | ✅ Activo |
| Tickets | 4000 | 4001 | 🔜 Futuro |
| Social Media | 5000 | 5001 | 🔜 Futuro |
| MySQL | 3306 | — | ✅ Activo |

---

## Estructura del proyecto

```
/var/www/asistencias/
├── client/              ← Frontend React
│   └── src/
│       ├── pages/       ← Páginas principales
│       ├── components/  ← Componentes reutilizables
│       └── _core/       ← NO TOCAR (auth hooks, etc.)
├── server/              ← Backend Node.js
│   ├── routers.ts       ← Procedimientos tRPC
│   ├── db.ts            ← Helpers de base de datos
│   └── _core/           ← NO TOCAR (oauth, trpc, context)
│       ├── trpc.ts      ← Definición de procedures (adminProcedure, reportesProcedure, etc.)
│       ├── cookies.ts   ← Configuración de cookies de sesión
│       └── oauth.ts     ← Google OAuth (NO TOCAR)
├── drizzle/             ← Schema y migraciones de BD
├── dist/                ← Compilado (generado por pnpm build en el servidor)
└── ecosystem.config.cjs ← Configuración de PM2 y variables de entorno
```

---

## Variables de entorno (ecosystem.config.cjs)

```
GOOGLE_CLIENT_ID     → ID de cliente OAuth de Google
GOOGLE_CLIENT_SECRET → Secret de OAuth de Google
APP_BASE_URL         → http://badabun.ddns.net
DATABASE_URL         → Conexión a MySQL
```

---

## Roles de usuario

| Rol | Permisos |
|---|---|
| `admin` | Todo: empleados, salarios, reportes, usuarios, cargar reportes, ver dinero |
| `reportes` | Cargar reportes, ver reportes sin montos de dinero |
| `user` | Dashboard (sin dinero), Cargar Reporte, ver Reportes (sin dinero) |

---

## Bugs resueltos (historial)

| Fecha | Bug | Solución | Archivo |
|---|---|---|---|
| 2026-05-27 | `TokenError: Bad Request` en Google OAuth | App OAuth en modo "Prueba" — agregar usuarios en Google Cloud Console | Google Cloud Console |
| 2026-05-27 | Login redirige de vuelta al login (cookie rechazada) | `sameSite: "none"` requiere HTTPS — cambiar a dinámico: `lax` en HTTP, `none` en HTTPS | `server/_core/cookies.ts` |
| 2026-05-27 | Tarjetas de departamento mostraban % asistencia y monto | Eliminar esas líneas del JSX | `client/src/pages/ReporteDetalle.tsx` |
| 2026-05-27 | Usuarios normales veían cantidades de dinero | Cambiar condiciones `!isReportesOnly` → `isAdmin` | `client/src/pages/ReporteDetalle.tsx`, `Dashboard.tsx` |
| 2026-05-27 | Usuarios normales no podían cargar reportes (FORBIDDEN) | Agregar `role !== 'user'` a `reportesProcedure` | `server/_core/trpc.ts` |

---

## Cómo agregar un nuevo sistema

1. Crear nuevo repo: `AlverichRJ/NOMBRE-BADA`
2. Crear schema MySQL separado: `badabun_tickets`, `badabun_social`, etc.
3. Deploy en directorio separado: `/var/www/tickets/`
4. PM2 en puertos nuevos: 4000, 5000, etc.
5. Agregar bloque `location` en Nginx para enrutar la nueva ruta
6. Abrir chat nuevo en Manus y pegar este archivo para orientar al asistente
