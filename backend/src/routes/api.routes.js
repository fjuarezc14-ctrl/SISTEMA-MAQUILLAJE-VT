import express from 'express';
import { protegerRuta } from '../middleware/auth.middleware.js';
import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  agregarLote
} from '../controllers/product.controller.js';
import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente
} from '../controllers/client.controller.js';
import {
  crearVenta,
  obtenerHistorialVentas
} from '../controllers/sale.controller.js';
import {
  obtenerCitas,
  crearCita,
  actualizarCita,
  eliminarCita
} from '../controllers/appointment.controller.js';
import {
  obtenerGastos,
  crearGasto,
  registrarConsumo
} from '../controllers/expense.controller.js';
import {
  obtenerDashboard,
  obtenerFinanzas
} from '../controllers/report.controller.js';

const router = express.Router();

// Aplicar middleware de protección a todas las rutas de negocio
router.use(protegerRuta);

// ── Rutas de Productos ──
router.get('/productos', obtenerProductos);
router.post('/productos', crearProducto);
router.put('/productos/:id', actualizarProducto);
router.delete('/productos/:id', eliminarProducto);
router.post('/productos/:id/lotes', agregarLote);

// ── Rutas de Clientes (CRM) ──
router.get('/clientes', obtenerClientes);
router.post('/clientes', crearCliente);
router.put('/clientes/:id', actualizarCliente);
router.delete('/clientes/:id', eliminarCliente);

// ── Rutas de Ventas ──
router.post('/ventas', crearVenta);
router.get('/ventas/historial', obtenerHistorialVentas);

// ── Rutas de Citas ──
router.get('/citas', obtenerCitas);
router.post('/citas', crearCita);
router.put('/citas/:id', actualizarCita);
router.delete('/citas/:id', eliminarCita);

// ── Rutas de Gastos Internos ──
router.get('/gastos', obtenerGastos);
router.post('/gastos', crearGasto);
router.put('/gastos/:id/consumo', registrarConsumo);

// ── Rutas de Reportes e Informes ──
router.get('/dashboard', obtenerDashboard);
router.get('/finanzas', obtenerFinanzas);

export default router;
