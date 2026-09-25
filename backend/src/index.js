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
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'GlowManager Pro', version: '1.0.0' });
});

import path from 'path';

// ── Servir archivos estáticos (Comprobantes de pago) ──
app.use('/uploads', express.static(path.resolve('uploads')));

// ── Rutas Públicas (Reservas online por QR sin autenticación) ──
import publicRoutes from './routes/public.routes.js';
app.use('/api/public', publicRoutes);

// ── Rutas de Autenticación ──
import authRoutes from './routes/auth.routes.js';
app.use('/api/auth', authRoutes);

// ── Rutas de Negocio (Protegidas) ──
import apiRoutes from './routes/api.routes.js';
app.use('/api', apiRoutes);

// ── Manejador de rutas no encontradas ──
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Inicio del servidor ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ GlowManager Pro API corriendo en http://0.0.0.0:${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});
