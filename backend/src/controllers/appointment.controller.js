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
    const { fecha, hora, clienteNombre, servicio, estado, notas, precioServicio, metodoPago, insumos, puntosCanjeados = 0 } = req.body;

    if (!fecha || !hora || !clienteNombre || !servicio) {
      return res.status(400).json({ error: 'Fecha, hora, cliente y servicio son obligatorios.' });
    }

    // Unimos fecha y hora en un solo objeto Date
    const fechaHora = new Date(`${fecha}T${hora}:00`);

    let finalCita = null;

    if (estado === 'Completado') {
      const priceServ = parseFloat(precioServicio || 0);
      if (isNaN(priceServ) || priceServ < 0) {
        return res.status(400).json({ error: 'El precio del servicio debe ser un número válido.' });
      }
      if (!metodoPago) {
        return res.status(400).json({ error: 'Debe especificar el método de pago para completar la cita.' });
      }

      await prisma.$transaction(async (tx) => {
        const canje = parseInt(puntosCanjeados) || 0;
        if (canje < 0) {
          throw new Error('La cantidad de puntos a canjear no puede ser negativa.');
        }

        // 1. Buscar o crear cliente
        let dbCliente = await tx.cliente.findFirst({
          where: {
            nombre: { equals: clienteNombre, mode: 'insensitive' },
            activo: true
          }
        });

        let descuentoPuntosVal = 0;
        if (canje > 0) {
          if (!dbCliente) {
            throw new Error('No se pueden canjear puntos para un cliente no registrado.');
          }
          if (dbCliente.puntosFidelidad < canje) {
            throw new Error(`El cliente solo tiene ${dbCliente.puntosFidelidad} puntos disponibles.`);
          }
          descuentoPuntosVal = canje * 0.5; // Equivalencia: 1 punto = S/ 0.50
          if (descuentoPuntosVal > priceServ) {
            throw new Error(`El descuento de puntos (S/ ${descuentoPuntosVal.toFixed(2)}) supera el total del servicio (S/ ${priceServ.toFixed(2)}).`);
          }
        }

        const totalNetoCita = Math.max(0, priceServ - descuentoPuntosVal);
        const nuevosPuntos = Math.floor(totalNetoCita / 10);

        if (dbCliente) {
          dbCliente = await tx.cliente.update({
            where: { id: dbCliente.id },
            data: {
              totalComprado: dbCliente.totalComprado.toNumber() + totalNetoCita,
              puntosFidelidad: dbCliente.puntosFidelidad - canje + nuevosPuntos
            }
          });
        }

        // 2. Crear la cita inicial
        finalCita = await tx.cita.create({
          data: {
            fecha: fechaHora,
            clienteNombre,
            clienteId: dbCliente ? dbCliente.id : null,
            servicio,
            estado: 'Completado',
            notas: notas || null,
            precioServicio: priceServ,
            ingresoRegistrado: true
          }
        });

        // 3. Insumos
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

        const itemsVentaData = [];
        itemsVentaData.push({
          productoId: prodServicio.id,
          nombreProducto: `Servicio: ${servicio}`,
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

          const lotesOrdenados = [...prod.lotes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          for (const lote of lotesOrdenados) {
            if (unidadesRequeridas <= 0) break;
            if (lote.stockActual <= 0) continue;

            const unidadesADescontar = Math.min(lote.stockActual, unidadesRequeridas);
            lote.stockActual -= unidadesADescontar;
            unidadesRequeridas -= unidadesADescontar;
            costoTotalCalculado += unidadesADescontar * lote.costo.toNumber();

            await tx.lote.update({
              where: { id: lote.id },
              data: { stockActual: lote.stockActual }
            });
          }

          await tx.citaInsumo.create({
            data: {
              citaId: finalCita.id,
              productoId: pId,
              cantidad: qty
            }
          });

          itemsVentaData.push({
            productoId: pId,
            nombreProducto: `${prod.nombre} (Insumo Sesión)`,
            cantidad: qty,
            precioUnitario: 0.00,
            costoUnitario: (costoTotalCalculado / qty)
          });
        }

        // 4. Crear la venta
        const nuevaVenta = await tx.venta.create({
          data: {
            clienteNombre: dbCliente ? dbCliente.nombre : clienteNombre,
            clienteId: dbCliente ? dbCliente.id : null,
            metodoPago,
            total: totalNetoCita,
            puntos: nuevosPuntos,
            descuentoPuntos: descuentoPuntosVal,
            llevaBolsa: false,
            citaId: finalCita.id,
            items: {
              create: itemsVentaData
            }
          }
        });

        // 5. Registrar movimientos en HistorialPuntos
        if (dbCliente) {
          if (canje > 0) {
            await tx.historialPuntos.create({
              data: {
                clienteId: dbCliente.id,
                puntos: -canje,
                concepto: `Canje de descuento en Cita (Descuento de S/ ${descuentoPuntosVal.toFixed(2)})`,
                ventaId: nuevaVenta.id
              }
            });
          }

          if (nuevosPuntos > 0) {
            await tx.historialPuntos.create({
              data: {
                clienteId: dbCliente.id,
                puntos: nuevosPuntos,
                concepto: `Acumulación por Cita`,
                ventaId: nuevaVenta.id
              }
            });
          }
        }
      });
    } else {
      // Flujo normal pendiente/cancelado
      const dbCliente = await prisma.cliente.findFirst({
        where: {
          nombre: { equals: clienteNombre, mode: 'insensitive' },
          activo: true
        }
      });

      finalCita = await prisma.cita.create({
        data: {
          fecha: fechaHora,
          clienteNombre,
          clienteId: dbCliente ? dbCliente.id : null,
          servicio,
          estado: estado || 'Pendiente',
          notas: notas || null
        }
      });
    }

    res.status(201).json({
      mensaje: 'Cita agendada exitosamente.',
      cita: {
        ...finalCita,
        fecha,
        hora
      }
    });
  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(400).json({ error: error.message || 'Error al agendar la cita.' });
  }
};

// ── PUT /api/citas/:id (Actualizar cita) ──
export const actualizarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, hora, clienteNombre, servicio, estado, notas, precioServicio, metodoPago, insumos, puntosCanjeados = 0 } = req.body;

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

    let isRevertingCompleted = false;
    if (citaExistente.estado === 'Completado' && (estado === 'Pendiente' || estado === 'Cancelado') && citaExistente.ingresoRegistrado) {
      isRevertingCompleted = true;
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
        
        dbCliente = await tx.cliente.findFirst({
          where: {
            nombre: {
              equals: nombreClienteCita,
              mode: 'insensitive'
            },
            activo: true
          }
        });

        const canje = parseInt(puntosCanjeados) || 0;
        if (canje < 0) {
          throw new Error('La cantidad de puntos a canjear no puede ser negativa.');
        }

        let descuentoPuntosVal = 0;
        if (canje > 0) {
          if (!dbCliente) {
            throw new Error('No se pueden canjear puntos para un cliente no registrado.');
          }
          if (dbCliente.puntosFidelidad < canje) {
            throw new Error(`El cliente solo tiene ${dbCliente.puntosFidelidad} puntos disponibles.`);
          }
          descuentoPuntosVal = canje * 0.5; // Equivalencia: 1 punto = S/ 0.50
          if (descuentoPuntosVal > priceServ) {
            throw new Error(`El descuento de puntos (S/ ${descuentoPuntosVal.toFixed(2)}) supera el total del servicio (S/ ${priceServ.toFixed(2)}).`);
          }
        }

        const totalNetoCita = Math.max(0, priceServ - descuentoPuntosVal);
        const nuevosPuntos = Math.floor(totalNetoCita / 10); // 1 punto por cada S/10 netos

        if (dbCliente) {
          dbCliente = await tx.cliente.update({
            where: { id: dbCliente.id },
            data: {
              totalComprado: dbCliente.totalComprado.toNumber() + totalNetoCita,
              puntosFidelidad: dbCliente.puntosFidelidad - canje + nuevosPuntos
            }
          });
        }

        // 4. Crear la Venta
        const nuevaVenta = await tx.venta.create({
          data: {
            clienteNombre: dbCliente ? dbCliente.nombre : nombreClienteCita,
            clienteId: dbCliente ? dbCliente.id : null,
            metodoPago,
            total: totalNetoCita,
            puntos: nuevosPuntos,
            descuentoPuntos: descuentoPuntosVal,
            llevaBolsa: false,
            citaId: citaId,
            items: {
              create: itemsVentaData
            }
          }
        });

        // Registrar movimientos en HistorialPuntos
        if (dbCliente) {
          if (canje > 0) {
            await tx.historialPuntos.create({
              data: {
                clienteId: dbCliente.id,
                puntos: -canje,
                concepto: `Canje de descuento en Cita (Descuento de S/ ${descuentoPuntosVal.toFixed(2)})`,
                ventaId: nuevaVenta.id
              }
            });
          }

          if (nuevosPuntos > 0) {
            await tx.historialPuntos.create({
              data: {
                clienteId: dbCliente.id,
                puntos: nuevosPuntos,
                concepto: `Acumulación por Cita`,
                ventaId: nuevaVenta.id
              }
            });
          }
        }

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
    } else if (isRevertingCompleted) {
      let fechaHora = undefined;
      if (fecha && hora) {
        fechaHora = new Date(`${fecha}T${hora}:00`);
      }

      await prisma.$transaction(async (tx) => {
        // 1. Buscar la venta asociada
        const venta = await tx.venta.findFirst({
          where: { citaId: citaId }
        });

        if (venta) {
          // 2. Revertir puntos y acumulados del cliente si está vinculado
          if (venta.clienteId) {
            const cliente = await tx.cliente.findUnique({
              where: { id: venta.clienteId }
            });
            if (cliente) {
              const canjeRevertir = Math.round(venta.descuentoPuntos.toNumber() * 2);
              const puntosGanadosRevertir = venta.puntos;
              await tx.cliente.update({
                where: { id: cliente.id },
                data: {
                  totalComprado: Math.max(0, cliente.totalComprado.toNumber() - venta.total.toNumber()),
                  puntosFidelidad: Math.max(0, cliente.puntosFidelidad + canjeRevertir - puntosGanadosRevertir)
                }
              });
            }
          }

          // 3. Eliminar registros de historial de puntos asociados a la venta
          await tx.historialPuntos.deleteMany({
            where: { ventaId: venta.id }
          });

          // 4. Eliminar la venta
          await tx.venta.delete({
            where: { id: venta.id }
          });
        }

        // 4. Revertir el stock de los insumos
        const insumosCita = await tx.citaInsumo.findMany({
          where: { citaId: citaId }
        });

        for (const ins of insumosCita) {
          const lotes = await tx.lote.findMany({
            where: { productoId: ins.productoId },
            orderBy: { createdAt: 'asc' }
          });

          if (lotes.length > 0) {
            await tx.lote.update({
              where: { id: lotes[0].id },
              data: {
                stockActual: lotes[0].stockActual + ins.cantidad
              }
            });
          }
        }

        // 5. Eliminar CitaInsumo
        await tx.citaInsumo.deleteMany({
          where: { citaId: citaId }
        });

        // 6. Actualizar cita restableciendo campos a Pendiente/Cancelado
        finalCita = await tx.cita.update({
          where: { id: citaId },
          data: {
            ...(fechaHora && { fecha: fechaHora }),
            ...(clienteNombre && { clienteNombre }),
            clienteId: citaExistente.clienteId,
            ...(servicio && { servicio }),
            estado: estado,
            precioServicio: 0.00,
            ingresoRegistrado: false,
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
