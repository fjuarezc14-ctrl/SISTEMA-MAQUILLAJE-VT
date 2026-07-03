// backend/src/controllers/auth.controller.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Generador de Token JWT
const generarToken = (id) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET || 'cambia_esto_por_una_clave_secreta_muy_larga_y_segura', 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ── Iniciar Sesión (POST /api/auth/login) ──
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validar campos obligatorios
    if (!email || !password) {
      return res.status(400).json({ error: 'Por favor, ingresa email y contraseña.' });
    }

    // 2. Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // 3. Validar estado del usuario
    if (!usuario.activo) {
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' });
    }

    // 4. Validar contraseña
    const esPasswordValido = await bcrypt.compare(password, usuario.password);
    if (!esPasswordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // 5. Generar JWT y asignar a Cookie httpOnly
    const token = generarToken(usuario.id);
    
    // Configuración de cookie (compatible con desarrollo y producción)
    res.cookie('token', token, {
      httpOnly: true, // Protección contra XSS
      secure: process.env.NODE_ENV === 'production', // true solo en HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
    });

    // 6. Responder con info básica del usuario
    res.json({
      mensaje: '¡Inicio de sesión exitoso!',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
      token // También lo enviamos en el body para flexibilidad del frontend
    });

  } catch (error) {
    console.error('Error en controller login:', error);
    res.status(500).json({ error: 'Error interno en el servidor.' });
  }
};

// ── Cerrar Sesión (POST /api/auth/logout) ──
export const logout = async (req, res) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0), // expira inmediatamente
    });
    res.json({ mensaje: 'Sesión cerrada exitosamente.' });
  } catch (error) {
    console.error('Error en controller logout:', error);
    res.status(500).json({ error: 'Error interno en el servidor.' });
  }
};

// ── Obtener Perfil de Usuario Logueado (GET /api/auth/me) ──
export const obtenerUsuarioActual = async (req, res) => {
  try {
    // req.usuario es asignado por el middleware protegerRuta
    res.json({ usuario: req.usuario });
  } catch (error) {
    console.error('Error en controller obtenerUsuarioActual:', error);
    res.status(500).json({ error: 'Error interno en el servidor.' });
  }
};
