// backend/src/routes/auth.routes.js
import express from 'express';
import { login, logout, obtenerUsuarioActual } from '../controllers/auth.controller.js';
import { protegerRuta } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { loginSchema } from '../schemas/auth.schema.js';

const router = express.Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', protegerRuta, obtenerUsuarioActual);

export default router;
