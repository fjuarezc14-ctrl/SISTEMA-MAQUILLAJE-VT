import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── GET /api/packs ──
export const obtenerPacks = async (req, res) => {
  try {
    const packs = await prisma.packPromocion.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'desc' }
    });

    const parsed = packs.map(p => {
      let items = [];
      try {
        items = JSON.parse(p.itemsJson || '[]');
      } catch (err) {
        console.warn(`[pack.controller] Error al parsear itemsJson para pack ID ${p.id}:`, err.message);
        items = [];
      }
      return {
        ...p,
        items
      };
    });

    res.json(parsed);
  } catch (error) {
    console.error('Error al obtener packs:', error);
    res.status(500).json({ error: 'Error al consultar packs promocionales.' });
  }
};

// ── POST /api/packs ──
export const crearPack = async (req, res) => {
  try {
    const { nombre, descripcion, precioPromo, items } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del pack es obligatorio.' });
    }

    const precio = parseFloat(precioPromo);
    if (isNaN(precio) || precio < 0) {
      return res.status(400).json({ error: 'El precio promocional debe ser válido.' });
    }

    const nuevoPack = await prisma.packPromocion.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        precioPromo: precio,
        itemsJson: JSON.stringify(items || [])
      }
    });

    res.status(201).json({
      mensaje: 'Pack promocional creado exitosamente.',
      pack: {
        ...nuevoPack,
        items: items || []
      }
    });
  } catch (error) {
    console.error('Error al crear pack:', error);
    res.status(500).json({ error: 'Error al crear pack promocional.' });
  }
};

// ── PUT /api/packs/:id ──
export const actualizarPack = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precioPromo, items } = req.body;

    const packId = parseInt(id);
    if (isNaN(packId)) {
      return res.status(400).json({ error: 'ID de pack inválido.' });
    }

    const data = {};
    if (nombre !== undefined) data.nombre = nombre.trim();
    if (descripcion !== undefined) data.descripcion = descripcion.trim() || null;
    if (precioPromo !== undefined) {
      const p = parseFloat(precioPromo);
      if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Precio inválido.' });
      data.precioPromo = p;
    }
    if (items !== undefined) {
      data.itemsJson = JSON.stringify(items);
    }

    const actualizado = await prisma.packPromocion.update({
      where: { id: packId },
      data
    });

    let itemsParsed = [];
    try {
      itemsParsed = JSON.parse(actualizado.itemsJson || '[]');
    } catch (err) {
      console.warn(`[pack.controller] Error al parsear itemsJson para pack actualizado ID ${packId}:`, err.message);
      itemsParsed = [];
    }

    res.json({
      mensaje: 'Pack promocional actualizado exitosamente.',
      pack: {
        ...actualizado,
        items: itemsParsed
      }
    });
  } catch (error) {
    console.error('Error al actualizar pack:', error);
    res.status(500).json({ error: 'Error al actualizar pack.' });
  }
};

// ── DELETE /api/packs/:id ──
export const eliminarPack = async (req, res) => {
  try {
    const { id } = req.params;
    const packId = parseInt(id);
    if (isNaN(packId)) {
      return res.status(400).json({ error: 'ID de pack inválido.' });
    }

    await prisma.packPromocion.update({
      where: { id: packId },
      data: { activo: false }
    });

    res.json({ mensaje: 'Pack promocional eliminado.' });
  } catch (error) {
    console.error('Error al eliminar pack:', error);
    res.status(500).json({ error: 'Error al eliminar pack.' });
  }
};
