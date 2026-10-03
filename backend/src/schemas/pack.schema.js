// backend/src/schemas/pack.schema.js
// Esquemas de validación Zod para Packs Promocionales
import { z } from 'zod';

export const packSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre del pack es obligatorio.' })
    .trim()
    .min(2, 'El nombre del pack debe tener al menos 2 caracteres.'),
  descripcion: z.string().trim().optional().nullable(),
  precioPromo: z.coerce
    .number({ required_error: 'El precio promocional es obligatorio.' })
    .min(0, 'El precio promocional no puede ser negativo.'),
  items: z.array(z.any()).optional().default([])
});
