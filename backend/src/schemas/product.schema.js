// backend/src/schemas/product.schema.js
// Esquemas de validación Zod para Productos y Lotes
import { z } from 'zod';

export const createProductSchema = z.object({
  codigo: z
    .string({ required_error: 'El código del producto es obligatorio.' })
    .trim()
    .min(1, 'El código no puede estar vacío.'),
  nombre: z
    .string({ required_error: 'El nombre del producto es obligatorio.' })
    .trim()
    .min(1, 'El nombre no puede estar vacío.'),
  categoria: z
    .string({ required_error: 'La categoría es obligatoria.' })
    .trim()
    .min(1, 'La categoría no puede estar vacía.'),
  precio: z.coerce
    .number({ required_error: 'El precio es obligatorio.' })
    .positive('El precio de venta debe ser mayor a 0.'),
  costo: z.coerce
    .number({ required_error: 'El costo inicial es obligatorio.' })
    .min(0, 'El costo no puede ser negativo.'),
  stock: z.coerce
    .number({ required_error: 'El stock inicial es obligatorio.' })
    .int('El stock debe ser un número entero.')
    .min(0, 'El stock no puede ser negativo.'),
  vencimiento: z
    .string()
    .trim()
    .optional()
    .nullable()
});

export const addLotSchema = z.object({
  costo: z.coerce
    .number({ required_error: 'El costo del lote es obligatorio.' })
    .min(0, 'El costo no puede ser negativo.'),
  stock: z.coerce
    .number({ required_error: 'La cantidad del lote es obligatoria.' })
    .int('La cantidad debe ser un número entero.')
    .positive('La cantidad a ingresar debe ser mayor a 0.')
});

export const updateProductSchema = z.object({
  codigo: z.string().trim().min(1, 'El código no puede estar vacío.').optional(),
  nombre: z.string().trim().min(1, 'El nombre no puede estar vacío.').optional(),
  categoria: z.string().trim().min(1, 'La categoría no puede estar vacía.').optional(),
  precio: z.coerce.number().positive('El precio debe ser mayor a 0.').optional(),
  vencimiento: z.string().trim().optional().nullable()
});

