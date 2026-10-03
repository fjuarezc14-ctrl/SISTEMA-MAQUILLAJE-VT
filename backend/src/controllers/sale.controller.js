import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generador de correlativo de comprobante
const generarCorrelativo = async (tipoComprobante, tx) => {
  const tipo = (tipoComprobante || 'TICKET').toUpperCase();
  const totalPrevios = await tx.venta.count({
    where: { tipoComprobante: tipo }
  });
  const numero = totalPrevios + 1;
  const numPad = String(numero).padStart(6, '0');

  if (tipo === 'BOLETA') return `B001-${numPad}`;
  if (tipo === 'FACTURA') return `F001-${numPad}`;
  return `TK-${numPad}`;
};

// ── POST /api/ventas (Registrar venta POS con pago mixto, comprobante y crédito) ──
export const crearVenta = async (req, res) => {
  try {
    const { 
      items, 
      clienteDni, 
      clienteNombre, 
      clienteTelefono, 
      clienteCorreo, 
      clienteFechaNacimiento, 
      metodoPago = 'Efectivo', 
      statusBolsa, 
      puntosCanjeados = 0,
      tipoVenta = 'CONTADO', // "CONTADO" | "CREDITO"
      tipoComprobante = 'TICKET', // "TICKET" | "BOLETA" | "FACTURA"
      montoEfectivo = 0,
      montoDigital = 0,
      metodoPagoDigital = null
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe incluir al menos un producto o servicio.' });
    }

    const canje = parseInt(puntosCanjeados) || 0;
    if (canje < 0) {
      return res.status(400).json({ error: 'La cantidad de puntos a canjear no puede ser negativa.' });
    }

    if (tipoVenta === 'CREDITO' && !clienteDni) {
      return res.status(400).json({ error: 'Para registrar una venta al crédito es obligatorio asociar un cliente con DNI.' });
    }

    // Ejecutar todo en transacción
    const ventaCreada = await prisma.$transaction(async (tx) => {
      // 0. Obtener sesión de caja abierta si existe
      const cajaAbierta = await tx.cajaSesion.findFirst({
        where: { estado: 'ABIERTA' },
        orderBy: { fechaApertura: 'desc' }
      });

      let totalVenta = 0;
      const itemsVentaData = [];

      // 1. Manejo de Bolsa de Regalo (BOLS-001) si aplica
      if (statusBolsa) {
        const bolsaProd = await tx.producto.findUnique({
          where: { codigo: 'BOLS-001' },
          include: { lotes: true }
        });

        if (bolsaProd) {
          const stockBolsaTotal = bolsaProd.lotes.reduce((sum, l) => sum + l.stockActual, 0);
          if (stockBolsaTotal > 0) {
            const lotesBolsaOrdenados = [...bolsaProd.lotes].sort((a, b) => b.costo.toNumber() - a.costo.toNumber());
            for (const lote of lotesBolsaOrdenados) {
              if (lote.stockActual > 0) {
                await tx.lote.update({
                  where: { id: lote.id },
                  data: { stockActual: lote.stockActual - 1 }
                });
                break;
              }
            }
          }
        }
      }

      // 2. Procesar cada ítem del carrito
      for (const item of items) {
        // Verificar si es un producto real o un servicio de boutique sin stock físico
        let prod = await tx.producto.findUnique({
          where: { id: item.id },
          include: { lotes: true }
        });

        // Si es un servicio agregado directamente al carrito (ej. SERV-xxx)
        if (!prod && item.tipo === 'SERVICIO') {
          prod = await tx.producto.findFirst({
            where: { codigo: 'SERV-GENERICO' }
          });
          if (!prod) {
            prod = await tx.producto.create({
              data: {
                codigo: 'SERV-GENERICO',
                nombre: item.nombre,
                categoria: 'Servicios',
                precio: item.precio,
                activo: true
              }
            });
          }
        }

        if (!prod) {
          throw new Error(`Producto o servicio "${item.nombre}" no encontrado.`);
        }

        const isServicio = prod.codigo.startsWith('SERV-') || item.tipo === 'SERVICIO';

        let costoUnitario = 0;
        if (!isServicio) {
          const stockTotal = prod.lotes.reduce((sum, l) => sum + l.stockActual, 0);
          if (stockTotal < item.qty) {
            throw new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${stockTotal}, Requerido: ${item.qty}`);
          }

          let unidadesRequeridas = item.qty;
          let costoTotalCalculado = 0;
          const lotesOrdenados = [...prod.lotes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

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
          costoUnitario = (costoTotalCalculado / item.qty);
        }

        const precioItem = parseFloat(item.precio || prod.precio);
        const subtotalItem = precioItem * item.qty;
        totalVenta += subtotalItem;

        itemsVentaData.push({
          productoId: prod.id,
          nombreProducto: item.nombre || prod.nombre,
          cantidad: item.qty,
          precioUnitario: precioItem,
          costoUnitario
        });
      }

      // 3. Manejo de Cliente y Puntos
      let dbCliente = null;
      let finalClienteNombre = clienteNombre || 'Cliente Anónimo';
      let descuentoPuntosVal = 0;

      if (clienteDni) {
        dbCliente = await tx.cliente.findUnique({
          where: { dni: clienteDni }
        });

        if (canje > 0) {
          if (!dbCliente) {
            throw new Error('No se pueden canjear puntos para un cliente no registrado.');
          }
          if (dbCliente.puntosFidelidad < canje) {
            throw new Error(`El cliente solo tiene ${dbCliente.puntosFidelidad} puntos disponibles.`);
          }
          descuentoPuntosVal = canje * 0.5;
          if (descuentoPuntosVal > totalVenta) {
            throw new Error(`El descuento de puntos supera el total de la venta.`);
          }
        }

        const totalNetoPagar = Math.max(0, totalVenta - descuentoPuntosVal);
        const nuevosPuntos = Math.floor(totalNetoPagar / 10);

        if (dbCliente) {
          dbCliente = await tx.cliente.update({
            where: { id: dbCliente.id },
            data: {
              totalComprado: dbCliente.totalComprado.toNumber() + totalNetoPagar,
              puntosFidelidad: dbCliente.puntosFidelidad - canje + nuevosPuntos,
              ...(clienteTelefono && { telefono: clienteTelefono }),
              ...(clienteCorreo && { correo: clienteCorreo })
            }
          });
          finalClienteNombre = dbCliente.nombre;
        } else if (clienteNombre) {
          dbCliente = await tx.cliente.create({
            data: {
              dni: clienteDni,
              nombre: clienteNombre,
              telefono: clienteTelefono || null,
              correo: clienteCorreo || null,
              fechaNacimiento: clienteFechaNacimiento || null,
              totalComprado: totalNetoPagar,
              puntosFidelidad: nuevosPuntos
            }
          });
        }
      }

      const totalNetoPagarFinal = Math.max(0, totalVenta - descuentoPuntosVal);
      const nuevosPuntosFinal = Math.floor(totalNetoPagarFinal / 10);

      // 4. Desglose de Pago (Mixto o Crédito)
      let finalMontoEfectivo = 0;
      let finalMontoDigital = 0;
      let saldoPendiente = 0;
      let estadoCredito = null;

      if (tipoVenta === 'CREDITO') {
        const abonoInicialEfectivo = parseFloat(montoEfectivo) || 0;
        const abonoInicialDigital = parseFloat(montoDigital) || 0;
        const abonoInicialTotal = abonoInicialEfectivo + abonoInicialDigital;

        finalMontoEfectivo = abonoInicialEfectivo;
        finalMontoDigital = abonoInicialDigital;
        saldoPendiente = Math.max(0, totalNetoPagarFinal - abonoInicialTotal);
        estadoCredito = saldoPendiente <= 0 ? 'PAGADO' : 'PENDIENTE';
      } else {
        // Venta al contado
        if (metodoPago === 'Pago Mixto') {
          finalMontoEfectivo = parseFloat(montoEfectivo) || 0;
          finalMontoDigital = parseFloat(montoDigital) || 0;
          const sumaMixta = finalMontoEfectivo + finalMontoDigital;
          if (Math.abs(sumaMixta - totalNetoPagarFinal) > 0.05) {
            throw new Error(`En Pago Mixto, la suma de efectivo (S/ ${finalMontoEfectivo.toFixed(2)}) y digital (S/ ${finalMontoDigital.toFixed(2)}) debe coincidir con el total a pagar (S/ ${totalNetoPagarFinal.toFixed(2)}).`);
          }
        } else if (metodoPago === 'Efectivo') {
          finalMontoEfectivo = totalNetoPagarFinal;
          finalMontoDigital = 0;
        } else {
          finalMontoEfectivo = 0;
          finalMontoDigital = totalNetoPagarFinal;
        }
        saldoPendiente = 0;
        estadoCredito = null;
      }

      // 5. Correlativo de Comprobante
      const numeroComp = await generarCorrelativo(tipoComprobante, tx);

      // 6. Crear la Venta
      const nuevaVenta = await tx.venta.create({
        data: {
          clienteNombre: finalClienteNombre,
          clienteId: dbCliente ? dbCliente.id : null,
          metodoPago,
          total: totalNetoPagarFinal,
          puntos: nuevosPuntosFinal,
          descuentoPuntos: descuentoPuntosVal,
          llevaBolsa: !!statusBolsa,
          tipoVenta,
          tipoComprobante,
          numeroComprobante: numeroComp,
          montoEfectivo: finalMontoEfectivo,
          montoDigital: finalMontoDigital,
          metodoPagoDigital: metodoPagoDigital || null,
          saldoPendiente,
          estadoCredito,
          cajaSesionId: cajaAbierta ? cajaAbierta.id : null,
          items: {
            create: itemsVentaData
          }
        },
        include: {
          items: true,
          cliente: true
        }
      });

      // 7. Si fue al crédito y hubo abono inicial, registrar AbonoCredito
      if (tipoVenta === 'CREDITO') {
        if (finalMontoEfectivo > 0) {
          await tx.abonoCredito.create({
            data: {
              ventaId: nuevaVenta.id,
              monto: finalMontoEfectivo,
              metodoPago: 'Efectivo',
              notas: 'Abono inicial en efectivo al generar crédito'
            }
          });
        }
        if (finalMontoDigital > 0) {
          await tx.abonoCredito.create({
            data: {
              ventaId: nuevaVenta.id,
              monto: finalMontoDigital,
              metodoPago: metodoPagoDigital || 'Yape/Plin',
              notas: 'Abono inicial digital al generar crédito'
            }
          });
        }
      }

      // 8. Movimientos en HistorialPuntos
      if (dbCliente) {
        if (canje > 0) {
          await tx.historialPuntos.create({
            data: {
              clienteId: dbCliente.id,
              puntos: -canje,
              concepto: `Canje de descuento en Venta (${numeroComp})`,
              ventaId: nuevaVenta.id
            }
          });
        }
        if (nuevosPuntosFinal > 0) {
          await tx.historialPuntos.create({
            data: {
              clienteId: dbCliente.id,
              puntos: nuevosPuntosFinal,
              concepto: `Acumulación por Compra (${numeroComp})`,
              ventaId: nuevaVenta.id
            }
          });
        }
      }

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

// ── GET /api/ventas/historial (Historial de ventas) ──
export const obtenerHistorialVentas = async (req, res) => {
  try {
    const { cliente, tipoComprobante, tipoVenta } = req.query;

    const where = {};
    if (cliente) {
      where.clienteNombre = { contains: cliente, mode: 'insensitive' };
    }
    if (tipoComprobante) {
      where.tipoComprobante = tipoComprobante;
    }
    if (tipoVenta) {
      where.tipoVenta = tipoVenta;
    }

    const ventas = await prisma.venta.findMany({
      where,
      include: {
        items: true,
        cliente: true,
        abonosCredito: true
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    res.json(ventas);
  } catch (error) {
    console.error('Error al obtener historial de ventas:', error);
    res.status(500).json({ error: 'Error al obtener el historial de ventas.' });
  }
};

// ── POST /api/ventas/:id/abonos (Registrar abono / pago a crédito) ──
export const registrarAbonoCredito = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, metodoPago = 'Efectivo', notas } = req.body;

    const ventaId = parseInt(id);
    if (isNaN(ventaId)) {
      return res.status(400).json({ error: 'ID de venta inválido.' });
    }

    const montoAbono = parseFloat(monto);
    if (isNaN(montoAbono) || montoAbono <= 0) {
      return res.status(400).json({ error: 'El monto de abono debe ser mayor a 0.' });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findUnique({
        where: { id: ventaId },
        include: { cliente: true }
      });

      if (!venta) {
        throw new Error('Venta no encontrada.');
      }

      if (venta.tipoVenta !== 'CREDITO') {
        throw new Error('Esta venta no fue emitida al crédito.');
      }

      const saldoActual = parseFloat(venta.saldoPendiente) || 0;
      if (saldoActual <= 0) {
        throw new Error('Esta venta ya se encuentra totalmente saldada.');
      }

      if (montoAbono > saldoActual) {
        throw new Error(`El monto del abono (S/ ${montoAbono.toFixed(2)}) supera el saldo pendiente (S/ ${saldoActual.toFixed(2)}).`);
      }

      // 1. Crear registro de abono
      const nuevoAbono = await tx.abonoCredito.create({
        data: {
          ventaId,
          monto: montoAbono,
          metodoPago,
          notas: notas?.trim() || null
        }
      });

      // 2. Actualizar saldo en la venta
      const nuevoSaldo = Math.max(0, saldoActual - montoAbono);
      const nuevoEstadoCredito = nuevoSaldo <= 0 ? 'PAGADO' : 'PENDIENTE';

      const ventaActualizada = await tx.venta.update({
        where: { id: ventaId },
        data: {
          saldoPendiente: nuevoSaldo,
          estadoCredito: nuevoEstadoCredito
        },
        include: {
          abonosCredito: true,
          cliente: true,
          items: true
        }
      });

      return { nuevoAbono, ventaActualizada };
    });

    res.status(201).json({
      mensaje: 'Abono registrado exitosamente.',
      abono: resultado.nuevoAbono,
      venta: resultado.ventaActualizada
    });

  } catch (error) {
    console.error('Error al registrar abono:', error);
    res.status(400).json({ error: error.message || 'Error al procesar el abono.' });
  }
};

// ── GET /api/ventas/creditos (Listar deudas y cuentas por cobrar) ──
export const obtenerCreditosPendientes = async (req, res) => {
  try {
    const creditos = await prisma.venta.findMany({
      where: {
        tipoVenta: 'CREDITO',
        saldoPendiente: { gt: 0 }
      },
      include: {
        cliente: true,
        abonosCredito: true,
        items: true
      },
      orderBy: { fecha: 'desc' }
    });

    res.json(creditos);
  } catch (error) {
    console.error('Error al obtener créditos:', error);
    res.status(500).json({ error: 'Error al consultar créditos pendientes.' });
  }
};

// ── GET /api/ventas/reporte-del-dia (Reporte de ingresos/egresos por actividad) ──
export const reporteVentasDelDia = async (req, res) => {
  try {
    const { fecha } = req.query;

    const targetDate = fecha ? new Date(fecha) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Ventas del día
    const ventas = await prisma.venta.findMany({
      where: {
        fecha: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        items: true
      }
    });

    let ingresosServicios = 0;
    let ingresosProductos = 0;
    let ventasEfectivo = 0;
    let ventasDigital = 0;
    let totalFacturado = 0;

    ventas.forEach((v) => {
      const tot = parseFloat(v.total) || 0;
      totalFacturado += tot;

      // Calcular proporción de servicios vs productos en la venta
      v.items.forEach((item) => {
        const itemTot = parseFloat(item.precioUnitario) * item.cantidad;
        if (item.nombreProducto.toLowerCase().includes('servicio') || item.nombreProducto.toLowerCase().includes('maquillaje') || item.nombreProducto.toLowerCase().includes('peinado') || item.nombreProducto.toLowerCase().includes('cejas')) {
          ingresosServicios += itemTot;
        } else {
          ingresosProductos += itemTot;
        }
      });

      if (v.tipoVenta === 'CREDITO') {
        ventasEfectivo += parseFloat(v.montoEfectivo) || 0;
        ventasDigital += parseFloat(v.montoDigital) || 0;
      } else if (v.metodoPago === 'Pago Mixto') {
        ventasEfectivo += parseFloat(v.montoEfectivo) || 0;
        ventasDigital += parseFloat(v.montoDigital) || 0;
      } else if (v.metodoPago === 'Efectivo') {
        ventasEfectivo += tot;
      } else {
        ventasDigital += tot;
      }
    });

    // 2. Abonos de créditos recibidos en el día
    const abonos = await prisma.abonoCredito.findMany({
      where: {
        fecha: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    const totalAbonos = abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);

    // 3. Egresos del día (Gastos internos)
    const gastos = await prisma.gastoInterno.findMany({
      where: {
        fechaIngreso: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    const totalGastos = gastos.reduce((sum, g) => sum + (parseFloat(g.costoTotal) || 0), 0);

    // 4. Inversión en Lotes ingresados hoy
    const lotesHoy = await prisma.lote.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    const totalComprasMercaderia = lotesHoy.reduce((sum, l) => sum + (parseFloat(l.costo) * l.stockInicial), 0);

    const totalIngresosReales = ventasEfectivo + ventasDigital + totalAbonos;
    const totalEgresosReales = totalGastos + totalComprasMercaderia;
    const balanceNeto = totalIngresosReales - totalEgresosReales;

    res.json({
      fecha: startOfDay.toISOString().split('T')[0],
      resumen: {
        totalFacturado,
        totalIngresosReales,
        ingresosServicios,
        ingresosProductos,
        totalAbonos,
        ventasEfectivo,
        ventasDigital,
        totalEgresosReales,
        totalGastosOperativos: totalGastos,
        totalComprasMercaderia,
        balanceNeto
      },
      ventas: ventas.map(v => ({
        id: v.id,
        hora: new Date(v.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        cliente: v.clienteNombre,
        tipoComprobante: v.tipoComprobante,
        numeroComprobante: v.numeroComprobante,
        tipoVenta: v.tipoVenta,
        metodoPago: v.metodoPago,
        total: parseFloat(v.total),
        items: v.items.map(i => `${i.cantidad}x ${i.nombreProducto}`).join(', ')
      })),
      gastos: gastos.map(g => ({
        id: g.id,
        categoria: g.categoria,
        item: g.item,
        costo: parseFloat(g.costoTotal)
      }))
    });

  } catch (error) {
    console.error('Error al generar reporte de ventas del día:', error);
    res.status(500).json({ error: 'Error al consultar reporte del día.' });
  }
};
