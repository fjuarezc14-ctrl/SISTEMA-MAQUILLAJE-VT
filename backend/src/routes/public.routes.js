import express from 'express';
import {
  obtenerConfiguracion,
  obtenerDisponibilidad,
  crearReservaPublica
} from '../controllers/public.controller.js';
import { uploadComprobante } from '../middleware/upload.middleware.js';

const router = express.Router();

router.get('/configuracion', obtenerConfiguracion);
router.get('/disponibilidad', obtenerDisponibilidad);
router.post('/reservar', uploadComprobante.single('comprobante'), crearReservaPublica);

export default router;