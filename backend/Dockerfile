# ── Dockerfile del Backend (Node.js + Express) ──
FROM node:22-alpine

# Instalar dependencias del sistema que Prisma necesita en Alpine
# openssl: requerido por el schema engine de Prisma
# libc6-compat: compatibilidad con binarios glibc
# tzdata: soporte de zonas horarias (ej. America/Lima)
RUN apk add --no-cache openssl libc6-compat tzdata

WORKDIR /app

# Copiar dependencias primero (aprovecha caché de Docker)
COPY package*.json ./
RUN npm install

# Copiar código fuente, schema de Prisma y migraciones
COPY . .

# Generar el cliente de Prisma con los binarios correctos para Alpine
RUN npx prisma generate

# Dar permisos de ejecución al script de arranque
RUN chmod +x entrypoint.sh

# Exponer el puerto del backend
EXPOSE 3003

# Usar entrypoint.sh: espera a la DB, aplica migraciones, inicia Express
ENTRYPOINT ["sh", "entrypoint.sh"]


