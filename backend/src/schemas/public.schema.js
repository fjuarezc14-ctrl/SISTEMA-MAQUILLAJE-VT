// backend/src/schemas/public.schema.js
// Esquema de validación Zod para reservas públicas vía QR / Web
import { z } from 'zod';

export const createPublicReservationSchema = z.object({
  clienteNombre: z
    .string({ required_error: 'El nombre completo es obligatorio.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.'),
  clienteDni: z
    .string({ required_error: 'El DNI es obligatorio.' })
    .trim()
    .regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos numéricos.'),
  clienteTelefono: z
    .string({ required_error: 'El teléfono / WhatsApp es obligatorio.' })
    .trim()
    .regex(/^9\d{8}$/, 'El teléfono debe ser un número celular peruano de 9 dígitos que inicie con 9.'),
  clienteCorreo: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform(val => (val === '' ? null : val))
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: 'El correo electrónico no tiene un formato válido.'
    }),
  servicio: z
    .string({ required_error: 'El servicio es obligatorio.' })
    .trim()
    .min(2, 'El nombre del servicio debe tener al menos 2 caracteres.'),
  fecha: z
    .string({ required_error: 'La fecha de la reserva es obligatoria.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD.'),
  hora: z
    .string({ required_error: 'La hora de la reserva es obligatoria.' })
    .regex(/^\d{2}:\d{2}$/, 'El formato de hora debe ser HH:MM.'),
  metodoPagoReserva: z
    .string({ required_error: 'El método de pago es obligatorio.' })
    .trim()
    .min(2, 'El método de pago es obligatorio.'),
  notas: z.string().trim().optional().nullable()
});
