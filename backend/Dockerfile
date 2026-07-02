# ── Dockerfile del Backend (Node.js + Express) ──
FROM node:22-alpine

WORKDIR /app

# Copiar dependencias primero
COPY package*.json ./
RUN npm ci

# Copiar código fuente y schema de Prisma
COPY . .

# Generar el cliente de Prisma
RUN npx prisma generate

# Exponer el puerto del backend
EXPOSE 3003

# Script de arranque: espera a la DB, migra, luego inicia el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
