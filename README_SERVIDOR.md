# Guía de Instalación — Servidor Propio Ubuntu

Este documento describe cómo instalar y configurar el **Sistema de Gestión de Asistencias y Nómina** en un servidor Ubuntu propio, sin dependencias de Manus.

---

## Requisitos del Servidor

| Componente | Versión recomendada | Notas |
|---|---|---|
| Ubuntu Server | 24.04 LTS | Ya instalado |
| Node.js | 22.x | Ya instalado |
| pnpm | 10.x | Ya instalado |
| PM2 | Última | Ya instalado |
| Nginx | 1.24+ | Ya instalado |
| MySQL | 8.0+ | Ya instalado |

---

## Paso 1: Configurar Google OAuth

El sistema usa Google OAuth 2.0 para el login. Necesitas crear credenciales en Google Cloud Console.

### 1.1 Crear proyecto en Google Cloud Console

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. En el menú lateral, ve a **APIs y servicios > Credenciales**
4. Haz clic en **+ Crear credenciales > ID de cliente OAuth 2.0**
5. Tipo de aplicación: **Aplicación web**
6. Nombre: `Sistema Asistencias Badabun`

### 1.2 Configurar URIs de redireccionamiento

En **URIs de redireccionamiento autorizados**, agrega:

```
http://192.168.10.73/api/oauth/google/callback
```

Si en el futuro tienes dominio, también agrega:
```
https://sistemabadabun.com/api/oauth/google/callback
```

### 1.3 Obtener credenciales

Después de crear, anota:
- **Client ID** (ej: `123456789-abc...apps.googleusercontent.com`)
- **Client Secret** (ej: `GOCSPX-...`)

---

## Paso 2: Configurar el archivo .env

```bash
cd /var/www/asistencias
cp .env.example .env
nano .env
```

Contenido del `.env`:

```env
# Base de datos MySQL
DATABASE_URL=mysql://asistencias:Badabun2026!@localhost:3306/asistencias

# Secreto para firmar JWT (generar con: openssl rand -base64 32)
JWT_SECRET=TU_SECRETO_ALEATORIO_AQUI

# Google OAuth 2.0
GOOGLE_CLIENT_ID=TU_CLIENT_ID_DE_GOOGLE
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET_DE_GOOGLE

# Email del dueño del sistema (se auto-promueve a admin en el primer login)
OWNER_EMAIL=tu_email@gmail.com

# URL base del servidor (sin slash al final)
APP_BASE_URL=http://192.168.10.73

# Directorio para subir archivos
UPLOADS_DIR=/var/www/asistencias/uploads

# Entorno
NODE_ENV=production
PORT=3000
```

Para generar un JWT_SECRET seguro:
```bash
openssl rand -base64 32
```

---

## Paso 3: Instalar y compilar

```bash
cd /var/www/asistencias

# Instalar dependencias
pnpm install --frozen-lockfile

# Aplicar migraciones de base de datos
pnpm drizzle-kit push

# Compilar el frontend
NODE_ENV=production pnpm build

# Crear directorio de uploads
mkdir -p uploads/app-logos
chmod 755 uploads
```

---

## Paso 4: Configurar PM2

```bash
# Crear directorio de logs
sudo mkdir -p /var/log/asistencias
sudo chown arj:arj /var/log/asistencias

# Iniciar la aplicación
pm2 start ecosystem.config.cjs

# Guardar configuración para reinicio automático
pm2 save
pm2 startup  # Seguir las instrucciones que muestra
```

---

## Paso 5: Configurar Nginx

```bash
# Copiar configuración
sudo cp nginx.conf /etc/nginx/sites-available/asistencias

# Activar el sitio
sudo ln -s /etc/nginx/sites-available/asistencias /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

---

## Paso 6: Primer acceso

1. Abre el navegador en `http://192.168.10.73`
2. Haz clic en **Iniciar sesión con Google**
3. Usa el email configurado en `OWNER_EMAIL`
4. El sistema te promoverá automáticamente a **admin**
5. Ya puedes acceder a todas las funciones

---

## Comandos útiles

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs en tiempo real
pm2 logs asistencias

# Reiniciar la aplicación
pm2 restart asistencias

# Actualizar código desde GitHub
cd /var/www/asistencias
./deploy.sh --update

# Ver logs de Nginx
sudo tail -f /var/log/nginx/asistencias_error.log
```

---

## Actualizar el sistema

Cuando haya nuevas versiones en GitHub:

```bash
cd /var/www/asistencias
./deploy.sh --update
```

Este comando:
1. Descarga los cambios de GitHub
2. Instala nuevas dependencias
3. Recompila el frontend
4. Reinicia la aplicación con PM2

---

## Estructura de directorios

```
/var/www/asistencias/
├── .env                    # Variables de entorno (NO subir a GitHub)
├── dist/                   # Frontend compilado (generado por pnpm build)
├── uploads/                # Archivos subidos (logos, etc.)
│   └── app-logos/
├── ecosystem.config.cjs    # Configuración de PM2
├── nginx.conf              # Configuración de Nginx (copiar a /etc/nginx/)
├── deploy.sh               # Script de despliegue
└── ...
```

---

## Solución de problemas

### El login de Google no funciona

1. Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` están correctos en `.env`
2. Verifica que la URI de redireccionamiento en Google Cloud Console es exactamente:
   `http://192.168.10.73/api/oauth/google/callback`
3. Revisa los logs: `pm2 logs asistencias`

### Error de base de datos

1. Verifica que MySQL está corriendo: `sudo systemctl status mysql`
2. Verifica las credenciales: `mysql -u asistencias -p asistencias`
3. Verifica el `DATABASE_URL` en `.env`

### El servidor no inicia

1. Verifica que el puerto 3000 no está ocupado: `sudo lsof -i :3000`
2. Verifica los logs de PM2: `pm2 logs asistencias --lines 50`
3. Verifica que `.env` existe y tiene todas las variables requeridas

### El logo no se muestra

Los logos subidos en Manus usaban URLs `/manus-storage/...`. En el servidor propio,
estas URLs se redirigen automáticamente a `/uploads/...`. Si el logo no aparece,
sube un nuevo logo desde la configuración del sistema.
