// backend/src/schemas/appointment.schema.js
// Esquemas de validación Zod para Citas y Reservas
import { z } from 'zod';

export const createAppointmentSchema = z.object({
  fecha: z
    .string({ required_error: 'La fecha y hora de la cita son obligatorias.' })
    .min(1, 'La fecha no puede estar vacía.'),
  clienteNombre: z
    .string({ required_error: 'El nombre del cliente es obligatorio.' })
    .trim()
    .min(1, 'El nombre del cliente no puede estar vacío.'),
  clienteId: z.number().int().optional().nullable(),
  servicio: z
    .string({ required_error: 'El servicio es obligatorio.' })
    .trim()
    .min(1, 'El servicio no puede estar vacío.'),
  precioServicio: z.coerce.number().min(0).optional().default(0),
  montoAdelanto: z.coerce.number().min(0).optional().default(20.00),
  personalId: z.number().int().optional().nullable(),
  notas: z.string().trim().optional().nullable(),
  insumos: z.array(z.object({
    productoId: z.number().int(),
    cantidad: z.number().int().positive()
  })).optional()
});
