import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── GET /api/servicios ──
export const obtenerServicios = async (req, res) => {
  try {
    const servicios = await prisma.servicio.findMany({
      where: { activo: true },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }]
    });
    res.json(servicios);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error al consultar catálogo de servicios.' });
  }
};

// ── POST /api/servicios ──
export const crearServicio = async (req, res) => {
  try {
    const { nombre, categoria, precio, duracion, descripcion } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del servicio es obligatorio.' });
    }

    const priceNum = parseFloat(precio);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'El precio del servicio debe ser un número válido mayor o igual a 0.' });
    }

    const nuevoServicio = await prisma.servicio.create({
      data: {
        nombre: nombre.trim(),
        categoria: categoria?.trim() || 'General',
        precio: priceNum,
        duracion: duracion?.trim() || '45 min',
        descripcion: descripcion?.trim() || null
      }
    });

    res.status(201).json({
      mensaje: 'Servicio creado exitosamente en el catálogo.',
      servicio: nuevoServicio
    });
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ error: 'Error al registrar servicio en el catálogo.' });
  }
};

// ── PUT /api/servicios/:id ──
export const actualizarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, categoria, precio, duracion, descripcion } = req.body;

    const servId = parseInt(id);
    if (isNaN(servId)) {
      return res.status(400).json({ error: 'ID de servicio inválido.' });
    }

    const data = {};
    if (nombre !== undefined) data.nombre = nombre.trim();
    if (categoria !== undefined) data.categoria = categoria.trim();
    if (precio !== undefined) {
      const p = parseFloat(precio);
      if (isNaN(p) || p < 0) {
        return res.status(400).json({ error: 'Precio inválido.' });
      }
      data.precio = p;
    }
    if (duracion !== undefined) data.duracion = duracion.trim();
    if (descripcion !== undefined) data.descripcion = descripcion.trim() || null;

    const servicioActualizado = await prisma.servicio.update({
      where: { id: servId },
      data
    });

    res.json({
      mensaje: 'Servicio actualizado exitosamente.',
      servicio: servicioActualizado
    });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error al actualizar servicio.' });
  }
};

// ── DELETE /api/servicios/:id ──
export const eliminarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const servId = parseInt(id);
    if (isNaN(servId)) {
      return res.status(400).json({ error: 'ID de servicio inválido.' });
    }

    await prisma.servicio.update({
      where: { id: servId },
      data: { activo: false }
    });

    res.json({ mensaje: 'Servicio desactivado del catálogo.' });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar servicio.' });
  }
};
