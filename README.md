# 🌸 GlowManager Pro

Sistema de gestión para negocio de cosméticos — **VALETEC Software**

> Stack: React + Vite | Node.js + Express | PostgreSQL | Docker

---

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 4.x
- [Node.js](https://nodejs.org/) ≥ 22 (solo para desarrollo sin Docker)
- [Git](https://git-scm.com/)

---

## 🚀 Arranque Rápido (Desarrollo Local)

### 1. Clonar el repositorio

```bash
git clone https://github.com/fjuarezc14-ctrl/SISTEMA-MAQUILLAJE-VT.git
cd SISTEMA-MAQUILLAJE-VT
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores (el archivo ya tiene valores para desarrollo local)
```

### 3. Levantar con Docker

> **Los contenedores NO se inician automáticamente** al abrir Docker Desktop.
> Usa el botón ▶ Play en Docker Desktop o el comando:

```bash
docker compose up -d
```

### 4. Acceder al sistema

| Servicio | URL |
|---|---|
| 🌐 Frontend (App) | http://localhost:5175 |
| ⚙️ Backend API | http://localhost:3003/api |
| 🗄️ PostgreSQL | localhost:5437 |

---

## 🔧 Comandos Útiles

```bash
# Levantar todos los servicios
docker compose up -d

# Levantar solo la base de datos (útil para desarrollo sin Docker del resto)
docker compose up -d glowmanager_db

# Ver logs en tiempo real
docker compose logs -f

# Bajar todos los servicios
docker compose down

# Resetear base de datos (¡borra todos los datos!)
docker compose down -v
```

### Prisma (dentro del contenedor del backend)

```bash
# Ejecutar migraciones
docker compose exec glowmanager_backend npx prisma migrate dev

# Abrir Prisma Studio (interfaz visual de la DB)
docker compose exec glowmanager_backend npx prisma studio

# Cargar datos de prueba
docker compose exec glowmanager_backend node prisma/seed.js
```

---

## 📁 Estructura del Proyecto

```
SISTEMA-MAQUILLAJE-VT/
├── frontend/          # React + Vite + Tailwind CSS (puerto 5175)
├── backend/           # Node.js + Express + Prisma (puerto 3003)
│   └── prisma/        # Schema y migraciones de la base de datos
├── .github/
│   └── workflows/     # CI/CD con GitHub Actions
├── docker-compose.yml
├── .env.example       # Plantilla de variables de entorno
└── README.md
```

---

## 🌐 Para el Equipo de Producción

Ver [`DEPLOY.md`](./DEPLOY.md) para instrucciones de despliegue en servidor.

**Variables de entorno requeridas en producción:**
- `DATABASE_URL` — Cadena de conexión a PostgreSQL
- `JWT_SECRET` — Clave secreta para JWT (mínimo 64 caracteres)
- `CORS_ORIGIN` — URL del dominio del frontend
- `VITE_API_URL` — URL pública de la API

---

## 📋 Módulos del Sistema

| Módulo | Descripción |
|---|---|
| 🔐 Login | Autenticación JWT |
| 📊 Dashboard | KPIs: ventas, citas, stock crítico, capital |
| 🛒 POS | Punto de venta con carrito y múltiples métodos de pago |
| 👥 CRM | Gestión de clientes con fidelización vía WhatsApp |
| 📦 Inventario | Control de stock multi-lote con vencimientos |
| 💸 Gastos | Control de consumibles e insumos internos |
| 📅 Citas | Agenda de servicios programados |
| 💰 Finanzas | Reporte de ingresos, egresos y ganancia neta |

---

*VALETEC Software — GlowManager Pro v1.0*
