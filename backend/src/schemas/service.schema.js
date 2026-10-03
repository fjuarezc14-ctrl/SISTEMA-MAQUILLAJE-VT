// backend/src/schemas/service.schema.js
// Esquemas de validación Zod para Servicios
import { z } from 'zod';

export const serviceSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre del servicio es obligatorio.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.'),
  categoria: z.string().trim().optional().default('General'),
  precio: z.coerce
    .number({ required_error: 'El precio es obligatorio.' })
    .min(0, 'El precio no puede ser negativo.'),
  duracion: z.string().trim().optional().default('45 min'),
  descripcion: z.string().trim().optional().nullable()
});
