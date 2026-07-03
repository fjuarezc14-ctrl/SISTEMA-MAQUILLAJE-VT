# 🚀 Guía de Despliegue en Producción — GlowManager Pro

Esta guía contiene las instrucciones y recomendaciones necesarias para el administrador de sistemas/infraestructura encargado de desplegar **GlowManager Pro** en producción.

---

## 📋 Variables de Entorno Requeridas

Cree un archivo `.env` en la raíz del servidor de producción basándose en el siguiente esquema:

```env
# ── CONFIGURACIÓN DE RED & PUERTOS
# Puertos expuestos en el servidor
FRONTEND_PORT=80
BACKEND_PORT=3003

# ── BASE DE DATOS (PostgreSQL)
POSTGRES_USER=glow_prod_admin
POSTGRES_PASSWORD=una_contrasenia_muy_segura_aqui
POSTGRES_DB=glowmanager_prod_db
DATABASE_URL="postgresql://glow_prod_admin:una_contrasenia_muy_segura_aqui@glowmanager_db:5432/glowmanager_prod_db"

# ── AUTENTICACIÓN (JWT)
JWT_SECRET=reemplazar_con_una_cadena_larga_y_aleatoria_de_al_menos_64_caracteres
JWT_EXPIRES_IN=7d

# ── ORÍGENES DE CORS
# Dominio final de la aplicación frontend para proteger la API de accesos no autorizados
CORS_ORIGIN=https://tu-dominio-glow.com
VITE_API_URL=https://api.tu-dominio-glow.com/api
```

---

## 🐳 Docker Compose en Producción

En producción, se recomienda configurar las políticas de reinicio automático (`restart: always` o `restart: unless-stopped`) a diferencia del entorno local, para asegurar la disponibilidad del sistema en caso de reinicio del servidor o fallas inesperadas.

Cree un archivo `docker-compose.prod.yml` o adapte el archivo base:

```yaml
version: '3.8'

services:
  glowmanager_db:
    image: postgres:16-alpine
    container_name: glowmanager_db_prod
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - glowmanager_postgres_prod_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  glowmanager_backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: glowmanager_backend_prod
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      BACKEND_PORT: 3003
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
      CORS_ORIGIN: ${CORS_ORIGIN}
    ports:
      - "3003:3003"
    depends_on:
      glowmanager_db:
        condition: service_healthy

  glowmanager_frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: glowmanager_frontend_prod
    restart: unless-stopped
    environment:
      VITE_API_URL: ${VITE_API_URL}
    ports:
      - "80:5175"
    depends_on:
      - glowmanager_backend
```

Para levantar los contenedores en producción:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🔒 Configuración del Servidor Web & SSL (Nginx)

Se recomienda utilizar Nginx como Proxy Inverso delante de los contenedores para manejar conexiones HTTPS y certificados SSL.

### Configuración del Host Virtual (`/etc/nginx/sites-available/glowmanager`)

```nginx
# 1. Redireccionar HTTP a HTTPS
server {
    listen 80;
    server_name tu-dominio-glow.com api.tu-dominio-glow.com;
    return 301 https://$host$request_uri;
}

# 2. Frontend de la aplicación
server {
    listen 443 ssl;
    server_name tu-dominio-glow.com;

    ssl_certificate /etc/letsencrypt/live/tu-dominio-glow.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio-glow.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80; # Puerto del contenedor de frontend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 3. Backend API
server {
    listen 443 ssl;
    server_name api.tu-dominio-glow.com;

    ssl_certificate /etc/letsencrypt/live/tu-dominio-glow.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio-glow.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3003; # Puerto del contenedor del backend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Configuración Automática de SSL con Let's Encrypt Certbot
```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio-glow.com -d api.tu-dominio-glow.com
```

---

## 🔄 Pipeline de Integración Continua (CI/CD)

El proyecto incluye un flujo de trabajo de GitHub Actions en `.github/workflows/ci.yml` que se ejecuta de forma automática en cada subida de código (`git push`) a la rama `main`. El pipeline realiza las siguientes tareas:
1. Valida y aplica las migraciones de base de datos en un entorno PostgreSQL efímero de test.
2. Descarga dependencias e intenta construir el bundle de producción del frontend (`npm run build`).
3. Compila las imágenes Docker del frontend y backend para certificar la integridad de las configuraciones.

---

## 💾 Estrategia de Copias de Seguridad (Backups)

Para asegurar la protección de la información en producción, se aconseja programar un cronjob diario en el servidor que realice un volcado de la base de datos PostgreSQL:

```bash
docker exec -t glowmanager_db_prod pg_dumpall -c -U glow_prod_admin > /var/backups/glowmanager_$(date +%Y%m%d).sql
```
