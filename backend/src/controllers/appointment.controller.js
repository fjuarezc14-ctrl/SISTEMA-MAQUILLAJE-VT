import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── GET /api/citas (Obtener todas las citas) ──
export const obtenerCitas = async (req, res) => {
  try {
    const citas = await prisma.cita.findMany({
      orderBy: [
        { fecha: 'asc' }
      ]
    });
    
    // Mapeamos para enviar la hora y fecha formateadas como cadenas si fuera necesario,
    // o simplemente las enviamos tal cual y que el front las maneje
    const citasFormateadas = citas.map(c => {
      // Obtenemos solo la hora HH:MM y fecha YYYY-MM-DD
      const localDate = new Date(c.fecha);
      const yyyy = localDate.getFullYear();
      const mm = String(localDate.getMonth() + 1).padStart(2, '0');
      const dd = String(localDate.getDate()).padStart(2, '0');
      const hh = String(localDate.getHours()).padStart(2, '0');
      const min = String(localDate.getMinutes()).padStart(2, '0');
      
      return {
        ...c,
        fecha: `${yyyy}-${mm}-${dd}`,
        hora: `${hh}:${min}`
      };
    });

    res.json(citasFormateadas);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ error: 'Error al obtener las citas.' });
  }
};

// ── POST /api/citas (Crear una cita) ──
export const crearCita = async (req, res) => {
  try {
    const { fecha, hora, clienteNombre, servicio, estado, notas } = req.body;

    if (!fecha || !hora || !clienteNombre || !servicio) {
      return res.status(400).json({ error: 'Fecha, hora, cliente y servicio son obligatorios.' });
    }

    // Unimos fecha y hora en un solo objeto Date
    const fechaHora = new Date(`${fecha}T${hora}:00`);

    // Intentamos buscar si el cliente ya existe en el CRM por nombre exacto para asociarlo
    const dbCliente = await prisma.cliente.findFirst({
      where: {
        nombre: {
          equals: clienteNombre,
          mode: 'insensitive'
        },
        activo: true
      }
    });

    const nuevaCita = await prisma.cita.create({
      data: {
        fecha: fechaHora,
        clienteNombre,
        clienteId: dbCliente ? dbCliente.id : null,
        servicio,
        estado: estado || 'Pendiente',
        notas: notas || null
      }
    });

    res.status(201).json({
      mensaje: 'Cita agendada exitosamente.',
      cita: {
        ...nuevaCita,
        fecha,
        hora
      }
    });
  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({ error: 'Error al agendar la cita.' });
  }
};

// ── PUT /api/citas/:id (Actualizar cita) ──
export const actualizarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, hora, clienteNombre, servicio, estado, notas, precioServicio, metodoPago, insumos } = req.body;

    const citaId = parseInt(id);
    if (isNaN(citaId)) {
      return res.status(400).json({ error: 'ID de cita inválido.' });
    }

    const citaExistente = await prisma.cita.findUnique({
      where: { id: citaId }
    });

    if (!citaExistente) {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }

    let isTransitioningToCompleted = false;
    if (citaExistente.estado !== 'Completado' && estado === 'Completado' && !citaExistente.ingresoRegistrado) {
      isTransitioningToCompleted = true;
    }

    let finalCita = null;

    if (isTransitioningToCompleted) {
      const priceServ = parseFloat(precioServicio || 0);
      if (isNaN(priceServ) || priceServ < 0) {
        return res.status(400).json({ error: 'El precio del servicio debe ser un número válido.' });
      }
      if (!metodoPago) {
        return res.status(400).json({ error: 'Debe especificar el método de pago para completar la cita.' });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Obtener o crear el producto de servicio genérico para registrar la venta de la mano de obra
        let prodServicio = await tx.producto.findFirst({
          where: { codigo: 'SERV-GENERICO' }
        });
        if (!prodServicio) {
          prodServicio = await tx.producto.create({
            data: {
              codigo: 'SERV-GENERICO',
              nombre: 'Servicio de Belleza / Sesión',
              categoria: 'Servicios',
              precio: 0,
              activo: true
            }
          });
        }

        // 2. Procesar los insumos consumidos
        const itemsVentaData = [];
        
        // Agregar el servicio de mano de obra
        itemsVentaData.push({
          productoId: prodServicio.id,
          nombreProducto: `Servicio: ${servicio || citaExistente.servicio}`,
          cantidad: 1,
          precioUnitario: priceServ,
          costoUnitario: 0.00
        });

        const insumosList = insumos || [];
        for (const insumo of insumosList) {
          const pId = parseInt(insumo.productoId);
          const qty = parseInt(insumo.cantidad);
          if (isNaN(pId) || isNaN(qty) || qty <= 0) continue;

          const prod = await tx.producto.findUnique({
            where: { id: pId, activo: true },
            include: { lotes: true }
          });

          if (!prod) {
            throw new Error(`Insumo no encontrado: Producto ID ${pId}`);
          }

          const stockTotal = prod.lotes.reduce((sum, l) => sum + l.stockActual, 0);
          if (qty > stockTotal) {
            throw new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${stockTotal} unidades.`);
          }

          let unidadesRequeridas = qty;
          let costoTotalCalculado = 0;

          // FIFO: Lotes más antiguos
          const lotesOrdenados = [...prod.lotes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          for (const lote of lotesOrdenados) {
            if (unidadesRequeridas <= 0) break;
            if (lote.stockActual <= 0) continue;

            const unidadesADescontar = Math.min(lote.stockActual, unidadesRequeridas);
            lote.stockActual -= unidadesADescontar;
            unidadesRequeridas -= unidadesADescontar;
            costoTotalCalculado += unidadesADescontar * lote.costo.toNumber();

            // Actualizar lote
            await tx.lote.update({
              where: { id: lote.id },
              data: { stockActual: lote.stockActual }
            });
          }

          // Guardar CitaInsumo relation
          await tx.citaInsumo.create({
            data: {
              citaId: citaId,
              productoId: pId,
              cantidad: qty
            }
          });

          // Agregar insumo a la boleta con precio 0.00 y costo unitario promedio
          itemsVentaData.push({
            productoId: pId,
            nombreProducto: `${prod.nombre} (Insumo Sesión)`,
            cantidad: qty,
            precioUnitario: 0.00,
            costoUnitario: (costoTotalCalculado / qty)
          });
        }

        // 3. Obtener o crear Cliente en CRM
        let dbCliente = null;
        const nombreClienteCita = clienteNombre || citaExistente.clienteNombre;
        
        // Buscamos si existe por nombre
        dbCliente = await tx.cliente.findFirst({
          where: {
            nombre: {
              equals: nombreClienteCita,
              mode: 'insensitive'
            },
            activo: true
          }
        });

        const nuevosPuntos = Math.floor(priceServ / 10); // 1 punto por cada S/10

        if (dbCliente) {
          dbCliente = await tx.cliente.update({
            where: { id: dbCliente.id },
            data: {
              totalComprado: dbCliente.totalComprado.toNumber() + priceServ,
              puntosFidelidad: dbCliente.puntosFidelidad + nuevosPuntos
            }
          });
        }

        // 4. Crear la Venta
        await tx.venta.create({
          data: {
            clienteNombre: dbCliente ? dbCliente.nombre : nombreClienteCita,
            clienteId: dbCliente ? dbCliente.id : null,
            metodoPago,
            total: priceServ,
            puntos: nuevosPuntos,
            llevaBolsa: false,
            items: {
              create: itemsVentaData
            }
          }
        });

        // 5. Actualizar Cita
        let fechaHora = undefined;
        if (fecha && hora) {
          fechaHora = new Date(`${fecha}T${hora}:00`);
        }

        finalCita = await tx.cita.update({
          where: { id: citaId },
          data: {
            ...(fechaHora && { fecha: fechaHora }),
            ...(clienteNombre && { clienteNombre }),
            clienteId: dbCliente ? dbCliente.id : (citaExistente.clienteId || null),
            ...(servicio && { servicio }),
            estado: 'Completado',
            precioServicio: priceServ,
            ingresoRegistrado: true,
            ...(notas !== undefined && { notas: notas || null })
          }
        });
      });
    } else {
      // Flujo normal sin cambio de estado a Completado (o ya estaba completado)
      let fechaHora = undefined;
      if (fecha && hora) {
        fechaHora = new Date(`${fecha}T${hora}:00`);
      }

      // Buscar si el cliente nuevo existe en el CRM
      let clienteId = undefined;
      if (clienteNombre) {
        const dbCliente = await prisma.cliente.findFirst({
          where: {
            nombre: {
              equals: clienteNombre,
              mode: 'insensitive'
            },
            activo: true
          }
        });
        clienteId = dbCliente ? dbCliente.id : null;
      }

      finalCita = await prisma.cita.update({
        where: { id: citaId },
        data: {
          ...(fechaHora && { fecha: fechaHora }),
          ...(clienteNombre && { clienteNombre }),
          ...(clienteId !== undefined && { clienteId }),
          ...(servicio && { servicio }),
          ...(estado && { estado }),
          ...(notas !== undefined && { notas: notas || null })
        }
      });
    }

    res.json({
      mensaje: 'Cita actualizada exitosamente.',
      cita: finalCita
    });
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(400).json({ error: error.message || 'Error al actualizar la cita.' });
  }
};

// ── DELETE /api/citas/:id (Eliminar cita) ──
export const eliminarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const citaId = parseInt(id);
    if (isNaN(citaId)) {
      return res.status(400).json({ error: 'ID de cita inválido.' });
    }

    await prisma.cita.delete({
      where: { id: citaId }
    });

    res.json({ mensaje: 'Cita eliminada exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar cita:', error);
    res.status(500).json({ error: 'Error al eliminar la cita.' });
  }
};
