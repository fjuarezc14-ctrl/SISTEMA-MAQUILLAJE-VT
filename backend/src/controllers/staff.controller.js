import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── GET /api/personal ──
export const obtenerPersonal = async (req, res) => {
  try {
    const personal = await prisma.personal.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
    res.json(personal);
  } catch (error) {
    console.error('Error al obtener personal:', error);
    res.status(500).json({ error: 'Error al consultar personal.' });
  }
};

// ── POST /api/personal ──
export const crearPersonal = async (req, res) => {
  try {
    const { nombre, cargo, telefono } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del personal es obligatorio.' });
    }
    if (!cargo || !cargo.trim()) {
      return res.status(400).json({ error: 'El cargo o especialidad es obligatorio.' });
    }

    const nuevoPersonal = await prisma.personal.create({
      data: {
        nombre: nombre.trim(),
        cargo: cargo.trim(),
        telefono: telefono?.trim() || null
      }
    });

    res.status(201).json({
      mensaje: 'Colaboradora registrada exitosamente.',
      personal: nuevoPersonal
    });
  } catch (error) {
    console.error('Error al registrar personal:', error);
    res.status(500).json({ error: 'Error al registrar personal.' });
  }
};

// ── PUT /api/personal/:id ──
export const actualizarPersonal = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, cargo, telefono } = req.body;

    const pId = parseInt(id);
    if (isNaN(pId)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    const data = {};
    if (nombre !== undefined) data.nombre = nombre.trim();
    if (cargo !== undefined) data.cargo = cargo.trim();
    if (telefono !== undefined) data.telefono = telefono.trim() || null;

    const actualizado = await prisma.personal.update({
      where: { id: pId },
      data
    });

    res.json({
      mensaje: 'Datos del personal actualizados exitosamente.',
      personal: actualizado
    });
  } catch (error) {
    console.error('Error al actualizar personal:', error);
    res.status(500).json({ error: 'Error al actualizar personal.' });
  }
};

// ── DELETE /api/personal/:id ──
export const eliminarPersonal = async (req, res) => {
  try {
    const { id } = req.params;
    const pId = parseInt(id);
    if (isNaN(pId)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    await prisma.personal.update({
      where: { id: pId },
      data: { activo: false }
    });

    res.json({ mensaje: 'Personal dado de baja correctamente.' });
  } catch (error) {
    console.error('Error al eliminar personal:', error);
    res.status(500).json({ error: 'Error al eliminar personal.' });
  }
};
