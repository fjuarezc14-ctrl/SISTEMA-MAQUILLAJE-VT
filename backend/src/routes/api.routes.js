import express from 'express';
import { protegerRuta, permitirRoles } from '../middleware/auth.middleware.js';
import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  agregarLote
} from '../controllers/product.controller.js';
import {
  obtenerClientes,
  buscarClientePorDni,
  crearCliente,
  actualizarCliente,
  eliminarCliente
} from '../controllers/client.controller.js';
import {
  crearVenta,
  obtenerHistorialVentas,
  registrarAbonoCredito,
  obtenerCreditosPendientes,
  reporteVentasDelDia
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
import {
  obtenerServicios,
  crearServicio,
  actualizarServicio,
  eliminarServicio
} from '../controllers/service.controller.js';
import {
  obtenerPersonal,
  crearPersonal,
  actualizarPersonal,
  eliminarPersonal
} from '../controllers/staff.controller.js';
import {
  obtenerEstadoCaja,
  abrirCaja,
  cerrarCaja,
  obtenerHistorialCajas
} from '../controllers/cash.controller.js';
import {
  obtenerPacks,
  crearPack,
  actualizarPack,
  eliminarPack
} from '../controllers/pack.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createProductSchema, updateProductSchema, addLotSchema } from '../schemas/product.schema.js';
import { createSaleSchema, registerCreditPaymentSchema } from '../schemas/sale.schema.js';
import { createAppointmentSchema, updateAppointmentSchema } from '../schemas/appointment.schema.js';
import { createClientSchema, updateClientSchema } from '../schemas/client.schema.js';
import { createExpenseSchema, consumeExpenseSchema } from '../schemas/expense.schema.js';
import { serviceSchema } from '../schemas/service.schema.js';
import { staffSchema } from '../schemas/staff.schema.js';
import { openCashSchema, closeCashSchema } from '../schemas/cash.schema.js';
import { packSchema } from '../schemas/pack.schema.js';

const router = express.Router();

// Aplicar middleware de protección a todas las rutas de negocio
router.use(protegerRuta);

// ── Rutas de Productos ──
router.get('/productos', obtenerProductos);
router.post('/productos', validateBody(createProductSchema), crearProducto);
router.put('/productos/:id', validateBody(updateProductSchema), actualizarProducto);
router.delete('/productos/:id', permitirRoles('ADMIN'), eliminarProducto);
router.post('/productos/:id/lotes', validateBody(addLotSchema), agregarLote);

// ── Rutas de Clientes (CRM) ──
router.get('/clientes', obtenerClientes);
router.get('/clientes/buscar/:dni', buscarClientePorDni);
router.post('/clientes', validateBody(createClientSchema), crearCliente);
router.put('/clientes/:id', validateBody(updateClientSchema), actualizarCliente);
router.delete('/clientes/:id', permitirRoles('ADMIN'), eliminarCliente);

// ── Rutas de Ventas, Comprobantes, Créditos y Reportes ──
router.post('/ventas', validateBody(createSaleSchema), crearVenta);
router.get('/ventas/historial', obtenerHistorialVentas);
router.get('/ventas/creditos', obtenerCreditosPendientes);
router.post('/ventas/:id/abonos', validateBody(registerCreditPaymentSchema), registrarAbonoCredito);
router.get('/ventas/reporte-del-dia', reporteVentasDelDia);

// ── Rutas de Citas ──
router.get('/citas', obtenerCitas);
router.post('/citas', validateBody(createAppointmentSchema), crearCita);
router.put('/citas/:id', validateBody(updateAppointmentSchema), actualizarCita);
router.delete('/citas/:id', permitirRoles('ADMIN'), eliminarCita);

// ── Rutas de Gastos Internos ──
router.get('/gastos', obtenerGastos);
router.post('/gastos', validateBody(createExpenseSchema), crearGasto);
router.put('/gastos/:id/consumo', validateBody(consumeExpenseSchema), registrarConsumo);

// ── Rutas de Reportes e Informes ──
router.get('/dashboard', obtenerDashboard);
router.get('/finanzas', permitirRoles('ADMIN'), obtenerFinanzas);

// ── Rutas de Servicios (Catálogo Oficial) ──
router.get('/servicios', obtenerServicios);
router.post('/servicios', permitirRoles('ADMIN'), validateBody(serviceSchema), crearServicio);
router.put('/servicios/:id', permitirRoles('ADMIN'), validateBody(serviceSchema), actualizarServicio);
router.delete('/servicios/:id', permitirRoles('ADMIN'), eliminarServicio);

// ── Rutas de Personal / Colaboradoras ──
router.get('/personal', obtenerPersonal);
router.post('/personal', permitirRoles('ADMIN'), validateBody(staffSchema), crearPersonal);
router.put('/personal/:id', permitirRoles('ADMIN'), validateBody(staffSchema), actualizarPersonal);
router.delete('/personal/:id', permitirRoles('ADMIN'), eliminarPersonal);

// ── Rutas de Control de Caja (Apertura / Arqueo / Cierre) ──
router.get('/caja/estado', obtenerEstadoCaja);
router.post('/caja/abrir', validateBody(openCashSchema), abrirCaja);
router.post('/caja/cerrar', validateBody(closeCashSchema), cerrarCaja);
router.get('/caja/historial', obtenerHistorialCajas);

// ── Rutas de Packs y Promociones ──
router.get('/packs', obtenerPacks);
router.post('/packs', permitirRoles('ADMIN'), validateBody(packSchema), crearPack);
router.put('/packs/:id', permitirRoles('ADMIN'), validateBody(packSchema), actualizarPack);
router.delete('/packs/:id', permitirRoles('ADMIN'), eliminarPack);

export default router;
