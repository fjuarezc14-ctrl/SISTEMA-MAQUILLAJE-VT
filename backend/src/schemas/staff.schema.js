// backend/src/schemas/staff.schema.js
// Esquemas de validación Zod para Personal / Colaboradoras
import { z } from 'zod';

export const staffSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre de la colaboradora es obligatorio.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.'),
  cargo: z
    .string({ required_error: 'El cargo o especialidad es obligatorio.' })
    .trim()
    .min(2, 'El cargo debe tener al menos 2 caracteres.'),
  telefono: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform(val => (val === '' ? null : val))
    .refine(val => !val || /^9\d{8}$/.test(val), {
      message: 'El teléfono debe tener 9 dígitos y comenzar con 9.'
    })
});
