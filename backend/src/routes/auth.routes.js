// backend/src/routes/auth.routes.js
import express from 'express';
import { login, logout, obtenerUsuarioActual } from '../controllers/auth.controller.js';
import { protegerRuta } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protegerRuta, obtenerUsuarioActual);

export default router;
