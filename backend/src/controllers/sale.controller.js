import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── POST /api/ventas (Registrar venta - descuento de stock y creación de registros) ──
export const crearVenta = async (req, res) => {
  try {
    const { items, clienteDni, clienteNombre, clienteTelefono, clienteCorreo, clienteFechaNacimiento, metodoPago, statusBolsa } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe incluir al menos un producto.' });
    }

    if (!metodoPago) {
      return res.status(400).json({ error: 'El método de pago es requerido.' });
    }

    // Ejecutamos todo dentro de una transacción para evitar inconsistencias en el stock
    const ventaCreada = await prisma.$transaction(async (tx) => {
      let totalVenta = 0;
      const itemsVentaData = [];

      // 1. Manejo de Bolsa de Regalo (BOLS-001) si está marcado
      if (statusBolsa) {
        const bolsaProd = await tx.producto.findUnique({
          where: { codigo: 'BOLS-001' },
          include: { lotes: true }
        });

        if (bolsaProd) {
          const stockBolsaTotal = bolsaProd.lotes.reduce((sum, l) => sum + l.stockActual, 0);
          if (stockBolsaTotal > 0) {
            // Ordenar por costo descendente (igual que en el HTML)
            const lotesBolsaOrdenados = [...bolsaProd.lotes].sort((a, b) => b.costo.toNumber() - a.costo.toNumber());
            
            // Consumir 1 bolsa de regalo
            let bolsaDescontada = false;
            for (const lote of lotesBolsaOrdenados) {
              if (lote.stockActual > 0) {
                await tx.lote.update({
                  where: { id: lote.id },
                  data: { stockActual: lote.stockActual - 1 }
                });
                bolsaDescontada = true;
                break;
              }
            }
          }
        }
      }

      // 2. Procesar cada ítem del carrito
      for (const item of items) {
        const prod = await tx.producto.findUnique({
          where: { id: item.id },
          include: { lotes: true }
        });

        if (!prod) {
          throw new Error(`Producto ${item.nombre} no encontrado.`);
        }

        const stockTotal = prod.lotes.reduce((sum, l) => sum + l.stockActual, 0);
        if (stockTotal < item.qty) {
          throw new Error(`Stock insuficiente para el producto ${prod.nombre}. Disponible: ${stockTotal}, Requerido: ${item.qty}`);
        }

        let unidadesRequeridas = item.qty;
        let costoTotalCalculado = 0;

        // Ordenar lotes por costo descendente para priorizar el descuento de lotes más costosos
        const lotesOrdenados = [...prod.lotes].sort((a, b) => b.costo.toNumber() - a.costo.toNumber());

        for (const lote of lotesOrdenados) {
          if (unidadesRequeridas <= 0) break;

          if (lote.stockActual > 0) {
            const aDescontar = Math.min(lote.stockActual, unidadesRequeridas);
            
            await tx.lote.update({
              where: { id: lote.id },
              data: { stockActual: lote.stockActual - aDescontar }
            });

            costoTotalCalculado += (lote.costo.toNumber() * aDescontar);
            unidadesRequeridas -= aDescontar;
          }
        }

        const subtotalItem = prod.precio.toNumber() * item.qty;
        totalVenta += subtotalItem;

        // Guardamos los datos del ítem para insertarlo luego en la relación
        itemsVentaData.push({
          productoId: prod.id,
          nombreProducto: prod.nombre,
          cantidad: item.qty,
          precioUnitario: prod.precio,
          costoUnitario: (costoTotalCalculado / item.qty) // Costo promedio de los lotes consumidos
        });
      }

      // 3. Manejo de Cliente y Puntos de Fidelidad
      let dbCliente = null;
      let finalClienteNombre = clienteNombre || 'Cliente Anónimo';

      if (clienteDni) {
        dbCliente = await tx.cliente.findUnique({
          where: { dni: clienteDni }
        });

        if (dbCliente) {
          // Si el cliente ya existe, acumulamos su total de compra e incrementamos puntos
          const nuevosPuntos = Math.floor(totalVenta / 100);
          dbCliente = await tx.cliente.update({
            where: { id: dbCliente.id },
            data: {
              totalComprado: dbCliente.totalComprado.toNumber() + totalVenta,
              puntosFidelidad: dbCliente.puntosFidelidad + nuevosPuntos,
              ...(clienteTelefono && { telefono: clienteTelefono }),
              ...(clienteCorreo && { correo: clienteCorreo })
            }
          });
          finalClienteNombre = dbCliente.nombre;
        } else if (clienteNombre) {
          // Si no existe pero se proporcionaron datos, lo creamos
          const nuevosPuntos = Math.floor(totalVenta / 100);
          dbCliente = await tx.cliente.create({
            data: {
              dni: clienteDni,
              nombre: clienteNombre,
              telefono: clienteTelefono || null,
              correo: clienteCorreo || null,
              fechaNacimiento: clienteFechaNacimiento || null,
              totalComprado: totalVenta,
              puntosFidelidad: nuevosPuntos
            }
          });
        }
      }

      // 4. Crear el registro de la Venta
      const nuevaVenta = await tx.venta.create({
        data: {
          clienteNombre: finalClienteNombre,
          clienteId: dbCliente ? dbCliente.id : null,
          metodoPago,
          total: totalVenta,
          puntos: Math.floor(totalVenta / 100),
          llevaBolsa: !!statusBolsa,
          items: {
            create: itemsVentaData
          }
        },
        include: {
          items: true
        }
      });

      return nuevaVenta;
    });

    res.status(201).json({
      mensaje: 'Venta procesada exitosamente.',
      venta: ventaCreada
    });

  } catch (error) {
    console.error('Error al crear venta:', error.message);
    res.status(400).json({ error: error.message || 'Error al procesar la venta.' });
  }
};

// ── GET /api/ventas/historial (Obtener historial de ventas con filtros opcionales) ──
export const obtenerHistorialVentas = async (req, res) => {
  try {
    const { cliente } = req.query;

    const queryOptions = {
      include: {
        items: true
      },
      orderBy: {
        fecha: 'desc'
      }
    };

    if (cliente) {
      queryOptions.where = {
        clienteNombre: {
          contains: cliente,
          mode: 'insensitive' // Búsqueda insensible a mayúsculas/minúsculas
        }
      };
    }

    const ventas = await prisma.venta.findMany(queryOptions);
    res.json(ventas);
  } catch (error) {
    console.error('Error al obtener historial de ventas:', error);
    res.status(500).json({ error: 'Error al obtener el historial de ventas.' });
  }
};
