import express from 'express';
import multer from 'multer';
import {
  obtenerConfiguracion,
  obtenerDisponibilidad,
  crearReservaPublica
} from '../controllers/public.controller.js';
import { uploadComprobante } from '../middleware/upload.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createPublicReservationSchema } from '../schemas/public.schema.js';

const router = express.Router();

// Middleware para capturar errores de Multer (tamaño, tipo de archivo) y responder en JSON
const handleComprobanteUpload = (req, res, next) => {
  uploadComprobante.single('comprobante')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El comprobante excede el tamaño máximo permitido de 10 MB.' });
      }
      return res.status(400).json({ error: `Error en la carga del comprobante: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

router.get('/configuracion', obtenerConfiguracion);
router.get('/disponibilidad', obtenerDisponibilidad);
router.post(
  '/reservar',
  handleComprobanteUpload,
  validateBody(createPublicReservationSchema),
  crearReservaPublica
);

export default router;