// backend/src/schemas/auth.schema.js
// Esquemas de validación Zod para el módulo de Autenticación
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio.' })
    .trim()
    .email('Formato de correo electrónico inválido.'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria.' })
    .min(1, 'La contraseña no puede estar vacía.')
});
