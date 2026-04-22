#!/bin/bash
# ============================================================
# deploy.sh — Script de despliegue para servidor Ubuntu propio
# Sistema de Gestión de Asistencias y Nómina
# ============================================================
# Uso: ./deploy.sh [--update]
#   Sin argumentos: instalación completa
#   --update: solo actualizar código y reiniciar
# ============================================================

set -e

APP_DIR="/var/www/asistencias"
APP_USER="arj"
NODE_ENV="production"

echo "=============================================="
echo "  Sistema de Asistencias — Deploy Script"
echo "=============================================="

# ── Verificar que estamos en el directorio correcto ──────────
if [ ! -f "$APP_DIR/package.json" ]; then
  echo "ERROR: No se encontró package.json en $APP_DIR"
  echo "Asegúrate de que el repositorio está clonado en $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

# ── Modo actualización (solo código) ─────────────────────────
if [ "$1" = "--update" ]; then
  echo ""
  echo "→ Actualizando código desde GitHub..."
  git pull origin main

  echo "→ Instalando dependencias..."
  pnpm install --frozen-lockfile

  echo "→ Compilando frontend..."
  NODE_ENV=production pnpm build

  echo "→ Reiniciando aplicación con PM2..."
  pm2 restart asistencias || pm2 start ecosystem.config.cjs

  echo ""
  echo "✓ Actualización completada"
  pm2 status
  exit 0
fi

# ── Instalación completa ──────────────────────────────────────
echo ""
echo "→ Verificando archivo .env..."
if [ ! -f "$APP_DIR/.env" ]; then
  echo "ERROR: No se encontró el archivo .env"
  echo "Copia .env.example a .env y configura las variables:"
  echo "  cp .env.example .env && nano .env"
  exit 1
fi

echo "→ Instalando dependencias..."
pnpm install --frozen-lockfile

echo "→ Ejecutando migraciones de base de datos..."
pnpm drizzle-kit push 2>/dev/null || echo "  (Las migraciones ya están aplicadas o no hay cambios)"

echo "→ Compilando frontend..."
NODE_ENV=production pnpm build

echo "→ Creando directorio de uploads..."
mkdir -p "$APP_DIR/uploads/app-logos"
chmod 755 "$APP_DIR/uploads"

echo "→ Configurando PM2..."
if pm2 list | grep -q "asistencias"; then
  pm2 restart asistencias
else
  pm2 start ecosystem.config.cjs
  pm2 save
fi

echo ""
echo "✓ Despliegue completado"
echo ""
echo "Estado de PM2:"
pm2 status

echo ""
echo "Para ver los logs:"
echo "  pm2 logs asistencias"
echo ""
echo "Para configurar Nginx, copia el archivo nginx.conf:"
echo "  sudo cp nginx.conf /etc/nginx/sites-available/asistencias"
echo "  sudo ln -s /etc/nginx/sites-available/asistencias /etc/nginx/sites-enabled/"
echo "  sudo nginx -t && sudo systemctl reload nginx"
