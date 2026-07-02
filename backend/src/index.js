// src/index.js — GlowManager Pro Backend
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3003;

// ── Middlewares globales ──
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5175',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'GlowManager Pro', version: '1.0.0' });
});

// ── Rutas (se irán agregando en fases siguientes) ──
// import authRoutes from './routes/auth.routes.js';
// app.use('/api/auth', authRoutes);

// ── Manejador de rutas no encontradas ──
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Inicio del servidor ──
app.listen(PORT, () => {
  console.log(`✅ GlowManager Pro API corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});
