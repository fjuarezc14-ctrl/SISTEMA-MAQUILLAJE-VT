// backend/src/schemas/sale.schema.js
// Esquemas de validación Zod para Ventas, Checkout y Abonos a Crédito
import { z } from 'zod';

const saleItemSchema = z.object({
  id: z.union([z.number(), z.string()], { required_error: 'El ID del ítem es obligatorio.' }),
  nombre: z.string().optional(),
  qty: z.coerce
    .number({ required_error: 'La cantidad es obligatoria.' })
    .int('La cantidad debe ser un número entero.')
    .positive('La cantidad debe ser mayor a 0.'),
  precio: z.coerce.number().min(0, 'El precio no puede ser negativo.').optional(),
  tipo: z.string().optional()
});

export const createSaleSchema = z.object({
  items: z
    .array(saleItemSchema, { required_error: 'Los ítems de la venta son obligatorios.' })
    .min(1, 'La venta debe incluir al menos un producto o servicio.'),
  clienteDni: z.string().trim().optional().nullable(),
  clienteNombre: z.string().trim().optional().nullable(),
  clienteTelefono: z.string().trim().optional().nullable(),
  clienteCorreo: z.string().trim().optional().nullable(),
  clienteFechaNacimiento: z.string().trim().optional().nullable(),
  metodoPago: z.string().optional().default('Efectivo'),
  statusBolsa: z.boolean().optional().default(false),
  puntosCanjeados: z.coerce.number().int().min(0).optional().default(0),
  tipoVenta: z.enum(['CONTADO', 'CREDITO']).optional().default('CONTADO'),
  tipoComprobante: z.enum(['TICKET', 'BOLETA', 'FACTURA']).optional().default('TICKET'),
  montoEfectivo: z.coerce.number().min(0).optional().default(0),
  montoDigital: z.coerce.number().min(0).optional().default(0),
  metodoPagoDigital: z.string().optional().nullable(),
  citaId: z.number().int().optional().nullable()
}).refine(data => {
  if (data.tipoVenta === 'CREDITO') {
    return !!data.clienteDni && data.clienteDni.trim().length > 0;
  }
  return true;
}, {
  message: 'Para registrar una venta al crédito es obligatorio asociar un cliente con DNI.',
  path: ['clienteDni']
});

export const registerCreditPaymentSchema = z.object({
  monto: z.coerce
    .number({ required_error: 'El monto del abono es obligatorio.' })
    .positive('El monto del abono debe ser mayor a 0.'),
  metodoPago: z
    .string({ required_error: 'El método de pago es obligatorio.' })
    .trim()
    .min(1, 'El método de pago no puede estar vacío.'),
  notas: z.string().trim().optional().nullable()
});
