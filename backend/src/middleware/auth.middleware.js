// backend/src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const protegerRuta = async (req, res, next) => {
  try {
    let token = null;

    // 1. Obtener token desde las cookies o desde el header Authorization
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'No autorizado. Token no proporcionado.' });
    }

    // 2. Verificar token
    const descodificado = jwt.verify(token, process.env.JWT_SECRET || 'cambia_esto_por_una_clave_secreta_muy_larga_y_segura');

    // 3. Buscar usuario en base de datos
    const usuario = await prisma.usuario.findUnique({
      where: { id: descodificado.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
      },
    });

    if (!usuario) {
      return res.status(401).json({ error: 'El usuario asociado a este token ya no existe.' });
    }

    if (!usuario.activo) {
      return res.status(401).json({ error: 'Este usuario ha sido desactivado.' });
    }

    // 4. Agregar usuario al objeto request
    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('Error en authMiddleware:', error.message);
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// Middleware para restringir accesos según roles (ej. solo ADMIN)
export const permitirRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Acceso denegado. No tienes permisos suficientes.' });
    }
    next();
  };
};
