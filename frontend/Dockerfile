# ── Dockerfile del Frontend (React + Vite) ──
# Imagen base ligera con Node.js LTS
FROM node:22-alpine

WORKDIR /app

# Copiar dependencias primero (capa de caché de Docker)
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Exponer el puerto de Vite
EXPOSE 5175

# Comando de desarrollo con hot-reload
CMD ["npm", "run", "dev", "--", "--host"]
