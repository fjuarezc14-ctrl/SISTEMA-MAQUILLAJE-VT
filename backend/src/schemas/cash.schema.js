// backend/src/schemas/cash.schema.js
// Esquemas de validación Zod para Arqueo y Control de Caja
import { z } from 'zod';

export const openCashSchema = z.object({
  montoApertura: z.coerce
    .number({ required_error: 'El monto de apertura es obligatorio.' })
    .min(0, 'El monto inicial no puede ser negativo.')
    .max(100000, 'El monto de apertura no puede exceder los S/ 100,000.'),
  notas: z.string().trim().optional().nullable()
});

export const closeCashSchema = z.object({
  montoCierre: z.coerce
    .number({ required_error: 'El monto físico en efectivo es obligatorio.' })
    .min(0, 'El monto contado no puede ser negativo.'),
  notas: z.string().trim().optional().nullable()
});
