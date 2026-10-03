// backend/src/schemas/appointment.schema.js
// Esquemas de validación Zod para Citas y Reservas
import { z } from 'zod';

export const createAppointmentSchema = z.object({
  fecha: z
    .string({ required_error: 'La fecha de la cita es obligatoria.' })
    .min(1, 'La fecha no puede estar vacía.'),
  hora: z
    .string({ required_error: 'La hora de la cita es obligatoria.' })
    .min(1, 'La hora no puede estar vacía.'),
  clienteNombre: z
    .string({ required_error: 'El nombre del cliente es obligatorio.' })
    .trim()
    .min(1, 'El nombre del cliente no puede estar vacío.'),
  clienteId: z.coerce.number().int().optional().nullable(),
  servicio: z
    .string({ required_error: 'El servicio es obligatorio.' })
    .trim()
    .min(1, 'El servicio no puede estar vacío.'),
  estado: z.string().optional().default('Pendiente'),
  precioServicio: z.coerce.number().min(0).optional().default(0),
  montoAdelanto: z.coerce.number().min(0).optional().default(20.00),
  metodoPago: z.string().optional().nullable(),
  personalId: z.coerce.number().int().optional().nullable(),
  notas: z.string().trim().optional().nullable(),
  insumos: z.array(z.any()).optional().default([]),
  puntosCanjeados: z.coerce.number().int().min(0).optional().default(0)
}).passthrough();

export const updateAppointmentSchema = z.object({
  fecha: z.string().optional(),
  hora: z.string().optional(),
  clienteNombre: z.string().trim().min(1).optional(),
  servicio: z.string().trim().min(1).optional(),
  estado: z.enum(['Pendiente', 'Confirmado', 'Completado', 'Cancelado', 'Anulado']).optional(),
  notas: z.string().trim().optional().nullable(),
  precioServicio: z.coerce.number().min(0).optional(),
  metodoPago: z.string().optional().nullable(),
  insumos: z.array(z.object({
    productoId: z.coerce.number().int(),
    cantidad: z.coerce.number().int().positive()
  })).optional(),
  puntosCanjeados: z.coerce.number().int().min(0).optional(),
  personalId: z.coerce.number().int().optional().nullable()
}).passthrough();


