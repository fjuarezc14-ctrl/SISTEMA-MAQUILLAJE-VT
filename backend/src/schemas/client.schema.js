// backend/src/schemas/client.schema.js
// Esquemas de validación Zod para el CRM de Clientes
import { z } from 'zod';

const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform(val => (val === '' ? null : val))
  .refine(val => !val || /^9\d{8}$/.test(val), {
    message: 'El teléfono debe ser un número celular de 9 dígitos que comience con 9.'
  });

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform(val => (val === '' ? null : val))
  .refine(val => !val || z.string().email().safeParse(val).success, {
    message: 'El correo electrónico no tiene un formato válido.'
  });

const optionalBirthDateSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform(val => (val === '' ? null : val))
  .refine(val => {
    if (!val) return true;
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, {
    message: 'La fecha de nacimiento no puede ser una fecha futura ni inválida.'
  });

export const createClientSchema = z.object({
  dni: z
    .string({ required_error: 'El DNI es obligatorio.' })
    .trim()
    .regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos numéricos.'),
  nombre: z
    .string({ required_error: 'El nombre del cliente es obligatorio.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.'),
  telefono: optionalPhoneSchema,
  correo: optionalEmailSchema,
  fechaNacimiento: optionalBirthDateSchema
});

export const updateClientSchema = z.object({
  dni: z
    .string()
    .trim()
    .regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos numéricos.')
    .optional()
    .nullable(),
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .optional(),
  telefono: optionalPhoneSchema,
  correo: optionalEmailSchema,
  fechaNacimiento: optionalBirthDateSchema
});
