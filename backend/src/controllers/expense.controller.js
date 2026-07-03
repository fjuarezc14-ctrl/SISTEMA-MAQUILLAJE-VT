import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── GET /api/gastos (Obtener todos los gastos) ──
export const obtenerGastos = async (req, res) => {
  try {
    const gastos = await prisma.gastoInterno.findMany({
      orderBy: {
        fechaIngreso: 'desc'
      }
    });
    res.json(gastos);
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    res.status(500).json({ error: 'Error al obtener los gastos.' });
  }
};

// ── POST /api/gastos (Crear un registro de gasto) ──
export const crearGasto = async (req, res) => {
  try {
    const { categoria, item, cantidad, costo } = req.body;

    if (!categoria || !item || cantidad === undefined || costo === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const nuevoGasto = await prisma.gastoInterno.create({
      data: {
        categoria,
        item,
        cantidadInicial: parseInt(cantidad),
        cantidadActual: parseInt(cantidad),
        costoTotal: parseFloat(costo),
        fechaIngreso: new Date()
      }
    });

    res.status(201).json({
      mensaje: 'Gasto registrado exitosamente.',
      gasto: nuevoGasto
    });
  } catch (error) {
    console.error('Error al registrar gasto:', error);
    res.status(500).json({ error: 'Error al registrar el gasto.' });
  }
};

// ── PUT /api/gastos/:id/consumo (Registrar consumo de un insumo) ──
export const registrarConsumo = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidadConsumida } = req.body;

    const gastoId = parseInt(id);
    if (isNaN(gastoId)) {
      return res.status(400).json({ error: 'ID de gasto inválido.' });
    }

    if (cantidadConsumida === undefined || parseInt(cantidadConsumida) <= 0) {
      return res.status(400).json({ error: 'La cantidad consumida debe ser mayor a 0.' });
    }

    const gasto = await prisma.gastoInterno.findUnique({
      where: { id: gastoId }
    });

    if (!gasto) {
      return res.status(404).json({ error: 'Gasto no encontrado.' });
    }

    if (parseInt(cantidadConsumida) > gasto.cantidadActual) {
      return res.status(400).json({ error: 'No se puede consumir más de la cantidad disponible.' });
    }

    const nuevaCantidadActual = gasto.cantidadActual - parseInt(cantidadConsumida);
    let fechaFin = null;
    let diasDuracion = null;

    if (nuevaCantidadActual === 0) {
      fechaFin = new Date();
      // Calcular diferencia en días
      const diffTime = Math.abs(fechaFin - new Date(gasto.fechaIngreso));
      diasDuracion = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }

    const gastoActualizado = await prisma.gastoInterno.update({
      where: { id: gastoId },
      data: {
        cantidadActual: nuevaCantidadActual,
        fechaFin,
        diasDuracion
      }
    });

    res.json({
      mensaje: nuevaCantidadActual === 0 
        ? `¡Recurso agotado! Duración total: ${diasDuracion} días.` 
        : 'Consumo registrado exitosamente.',
      gasto: gastoActualizado
    });
  } catch (error) {
    console.error('Error al registrar consumo de gasto:', error);
    res.status(500).json({ error: 'Error al registrar el consumo del gasto.' });
  }
};
