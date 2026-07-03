#!/bin/sh
# backend/entrypoint.sh
# Script de arranque con reintentos para que el backend espere a la DB
# antes de aplicar migraciones e iniciar el servidor.

set -e

echo ""
echo "🌸 GlowManager Pro — Backend API"
echo "================================="

# ── Esperar a que PostgreSQL esté listo ──────────────────────────────
echo "⏳ Esperando a que la base de datos esté disponible..."

MAX_RETRIES=15
RETRY=0

until npx prisma migrate deploy 2>&1; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    echo "❌ Error: no se pudo conectar a la base de datos después de $MAX_RETRIES intentos."
    echo "   Verifica que el contenedor glowmanager_db esté corriendo y saludable."
    exit 1
  fi
  echo "   ↩️  Intento $RETRY/$MAX_RETRIES — reintentando en 3 segundos..."
  sleep 3
done

echo "✅ Migraciones aplicadas correctamente."

echo "⚙️ Generando cliente de Prisma..."
npx prisma generate

echo "🚀 Iniciando servidor Express en puerto ${BACKEND_PORT:-3003}..."
echo ""

# exec reemplaza el proceso shell por Node (importante para señales SIGTERM)
exec node src/index.js
