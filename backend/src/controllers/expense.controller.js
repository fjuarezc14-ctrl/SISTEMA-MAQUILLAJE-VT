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
    const { categoria, item, cantidad, costo, productoId } = req.body;

    if (!categoria || (productoId === undefined && !item) || cantidad === undefined || (productoId === undefined && costo === undefined)) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const qty = parseInt(cantidad);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0.' });
    }

    let itemFinal = item;
    let costoTotalFinal = parseFloat(costo);
    let prodIdParsed = null;

    if (productoId !== undefined && productoId !== null && productoId !== '') {
      prodIdParsed = parseInt(productoId);
      if (isNaN(prodIdParsed)) {
        return res.status(400).json({ error: 'ID de producto inválido.' });
      }

      // Procesamos descuento de stock y cálculo de costos mediante transacción
      const resultado = await prisma.$transaction(async (tx) => {
        const prod = await tx.producto.findUnique({
          where: { id: prodIdParsed, activo: true },
          include: { lotes: true }
        });

        if (!prod) {
          throw new Error('Producto no encontrado en el inventario.');
        }

        const stockTotal = prod.lotes.reduce((sum, l) => sum + l.stockActual, 0);
        if (qty > stockTotal) {
          throw new Error(`Stock insuficiente. Solo hay ${stockTotal} unidades disponibles.`);
        }

        let unidadesRequeridas = qty;
        let costoTotalCalculado = 0;

        // FIFO: Ordenar lotes por fecha de creación ascendente
        const lotesOrdenados = [...prod.lotes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        for (const lote of lotesOrdenados) {
          if (unidadesRequeridas <= 0) break;
          if (lote.stockActual <= 0) continue;

          const unidadesADescontar = Math.min(lote.stockActual, unidadesRequeridas);
          lote.stockActual -= unidadesADescontar;
          unidadesRequeridas -= unidadesADescontar;
          costoTotalCalculado += unidadesADescontar * lote.costo.toNumber();

          // Actualizar el lote en la DB
          await tx.lote.update({
            where: { id: lote.id },
            data: { stockActual: lote.stockActual }
          });
        }

        // Crear registro de GastoInterno
        const nuevoGasto = await tx.gastoInterno.create({
          data: {
            categoria,
            item: `[Inventario] ${prod.nombre}`,
            cantidadInicial: qty,
            cantidadActual: 0,
            costoTotal: costoTotalCalculado,
            fechaIngreso: new Date(),
            fechaFin: new Date(),
            diasDuracion: 0,
            productoId: prodIdParsed
          }
        });

        return nuevoGasto;
      });

      return res.status(201).json({
        mensaje: 'Gasto de inventario registrado y stock descontado exitosamente.',
        gasto: resultado
      });
    }

    // Flujo normal (gasto manual)
    const nuevoGasto = await prisma.gastoInterno.create({
      data: {
        categoria,
        item: itemFinal,
        cantidadInicial: qty,
        cantidadActual: qty,
        costoTotal: costoTotalFinal,
        fechaIngreso: new Date()
      }
    });

    res.status(201).json({
      mensaje: 'Gasto registrado exitosamente.',
      gasto: nuevoGasto
    });
  } catch (error) {
    console.error('Error al registrar gasto:', error);
    res.status(400).json({ error: error.message || 'Error al registrar el gasto.' });
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
