// backend/src/schemas/expense.schema.js
// Esquemas de validación Zod para Gastos Internos e Insumos
import { z } from 'zod';

export const createExpenseSchema = z.object({
  categoria: z
    .string({ required_error: 'La categoría es obligatoria.' })
    .trim()
    .min(1, 'La categoría no puede estar vacía.'),
  item: z.string().trim().optional().nullable(),
  cantidad: z.coerce
    .number({ required_error: 'La cantidad es obligatoria.' })
    .int('La cantidad debe ser un número entero.')
    .positive('La cantidad debe ser mayor a 0.'),
  costo: z.coerce
    .number()
    .min(0, 'El costo no puede ser negativo.')
    .optional()
    .nullable(),
  productoId: z.union([z.number().int(), z.string()]).optional().nullable()
});

export const consumeExpenseSchema = z.object({
  cantidadConsumida: z.coerce
    .number({ required_error: 'La cantidad consumida es obligatoria.' })
    .int('La cantidad debe ser un número entero.')
    .positive('La cantidad consumida debe ser mayor a 0.')
});
