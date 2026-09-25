import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper para obtener el rango del día actual en la zona horaria local
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// ── GET /api/dashboard (Métricas avanzadas del Dashboard) ──
export const obtenerDashboard = async (req, res) => {
  try {
    const { start, end } = getTodayRange();

    // 1. Ingresos totales (Ventas)
    const ventas = await prisma.venta.findMany({
      select: { total: true }
    });
    const ingresos = ventas.reduce((sum, v) => sum + v.total.toNumber(), 0);

    // 2. Citas para hoy (conteo y lista detallada de notificaciones)
    const citasDelDia = await prisma.cita.findMany({
      where: {
        fecha: {
          gte: start,
          lte: end
        },
        estado: { notIn: ['Cancelado', 'Anulado'] }
      },
      orderBy: { fecha: 'asc' }
    });

    const citasHoyCount = citasDelDia.length;
    const proximasCitas = citasDelDia.map(c => ({
      id: c.id,
      cliente: c.clienteNombre,
      servicio: c.servicio,
      hora: new Date(c.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      estado: c.estado,
      montoAdelanto: parseFloat(c.montoAdelanto || 0),
      precioServicio: parseFloat(c.precioServicio || 0)
    }));

    // 3. Citas del mes actual (para el Calendario visual del Dashboard)
    const hoy = new Date();
    const startOfMonth = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);

    const citasMesRaw = await prisma.cita.findMany({
      where: {
        fecha: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        estado: { notIn: ['Cancelado', 'Anulado'] }
      },
      orderBy: { fecha: 'asc' }
    });

    const citasMes = citasMesRaw.map(c => {
      const d = new Date(c.fecha);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return {
        id: c.id,
        fechaStr: `${yyyy}-${mm}-${dd}`,
        hora: d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        cliente: c.clienteNombre,
        servicio: c.servicio,
        estado: c.estado
      };
    });

    // 4. Inventario: Stock Crítico, Quiebre de Stock, Capital y Vencimientos
    const productos = await prisma.producto.findMany({
      where: { activo: true, codigo: { not: 'SERV-GENERICO' } },
      include: { lotes: true }
    });

    let stockCritico = 0;
    let capital = 0;
    const alertasQuiebreStock = [];
    const alertasVencimiento = [];

    const finHoy = new Date();
    finHoy.setHours(23, 59, 59, 999);
    const limiteAlerta = new Date(finHoy);
    limiteAlerta.setDate(limiteAlerta.getDate() + 45);

    productos.forEach(p => {
      const stockTotal = p.lotes.reduce((sum, l) => sum + l.stockActual, 0);

      if (stockTotal <= 5) {
        stockCritico++;
      }

      // Alerta de quiebre de stock específica
      if (stockTotal <= 3) {
        alertasQuiebreStock.push({
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          categoria: p.categoria,
          stockTotal,
          precio: p.precio.toNumber(),
          estado: stockTotal === 0 ? 'AGOTADO' : 'CRITICO'
        });
      }

      capital += p.precio.toNumber() * stockTotal;

      // Alertas de vencimiento
      if (p.vencimiento && p.vencimiento !== '-') {
        let fechaVenc = null;
        if (p.vencimiento.includes('/')) {
          const [dia, mes, anio] = p.vencimiento.split('/');
          fechaVenc = new Date(`${anio}-${mes}-${dia}T23:59:59.999`);
        } else {
          fechaVenc = new Date(p.vencimiento);
          fechaVenc.setHours(23, 59, 59, 999);
        }

        if (!isNaN(fechaVenc.getTime())) {
          if (fechaVenc < hoy) {
            alertasVencimiento.push({
              id: p.id,
              nombre: p.nombre,
              codigo: p.codigo,
              vencimiento: p.vencimiento,
              tipo: 'VENCIDO',
              detalle: `¡VENCIDO el ${p.vencimiento}!`
            });
          } else if (fechaVenc <= limiteAlerta) {
            const diffTime = fechaVenc.getTime() - hoy.getTime();
            const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
            alertasVencimiento.push({
              id: p.id,
              nombre: p.nombre,
              codigo: p.codigo,
              vencimiento: p.vencimiento,
              tipo: diffDays === 0 ? 'VENCIDO' : 'PROXIMO',
              detalle: diffDays === 0 
                ? `¡Vence HOY (${p.vencimiento})!` 
                : `Próximo a vencer en ${diffDays} día(s) (${p.vencimiento})`
            });
          }
        }
      }
    });

    // Ordenar alertas de quiebre (los de stock 0 primero)
    alertasQuiebreStock.sort((a, b) => a.stockTotal - b.stockTotal);

    // 5. Ranking de Productos TOP de Ventas
    const itemsVendidos = await prisma.itemVenta.findMany({
      where: {
        producto: {
          codigo: { notIn: ['BOLS-001', 'SERV-GENERICO'] }
        }
      },
      select: {
        productoId: true,
        nombreProducto: true,
        cantidad: true,
        precioUnitario: true
      }
    });

    const rankingMap = {};
    itemsVendidos.forEach(item => {
      const pid = item.productoId;
      if (!rankingMap[pid]) {
        rankingMap[pid] = {
          productoId: pid,
          nombre: item.nombreProducto,
          unidadesVendidas: 0,
          totalRecaudado: 0
        };
      }
      rankingMap[pid].unidadesVendidas += item.cantidad;
      rankingMap[pid].totalRecaudado += item.cantidad * parseFloat(item.precioUnitario);
    });

    const productosTop = Object.values(rankingMap)
      .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
      .slice(0, 5);

    res.json({
      ingresos,
      citasHoy: citasHoyCount,
      proximasCitas,
      citasMes,
      stockCritico,
      capital,
      alertasQuiebreStock,
      alertasVencimiento,
      productosTop
    });

  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    res.status(500).json({ error: 'Error al obtener datos del dashboard.' });
  }
};

// ── GET /api/finanzas (Métricas de Finanzas y Balance) ──
export const obtenerFinanzas = async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      select: { total: true }
    });
    const ingresos = ventas.reduce((sum, v) => sum + v.total.toNumber(), 0);

    const itemsVendidos = await prisma.itemVenta.findMany({
      select: { cantidad: true, costoUnitario: true }
    });
    const costoVentas = itemsVendidos.reduce((sum, item) => sum + (item.cantidad * item.costoUnitario.toNumber()), 0);

    const gastosInternos = await prisma.gastoInterno.findMany({
      select: { costoTotal: true }
    });
    const totalGastos = gastosInternos.reduce((sum, g) => sum + g.costoTotal.toNumber(), 0);

    const egresos = costoVentas + totalGastos;
    const gananciaNeta = ingresos - egresos;

    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: { lotes: true }
    });
    let capital = 0;
    productos.forEach(p => {
      const stockTotal = p.lotes.reduce((sum, l) => sum + l.stockActual, 0);
      capital += p.precio.toNumber() * stockTotal;
    });

    const allVentas = await prisma.venta.findMany({
      include: { items: true },
      orderBy: { fecha: 'desc' }
    });

    const allGastos = await prisma.gastoInterno.findMany({
      orderBy: { fechaIngreso: 'desc' }
    });

    const movimientos = [];

    allVentas.forEach(v => {
      const esCita = v.citaId !== null;
      movimientos.push({
        id: `ingreso-${v.id}`,
        fecha: v.fecha,
        tipo: 'Ingreso',
        concepto: esCita ? 'Servicio de Cita' : 'Venta POS',
        detalle: `Cliente: ${v.clienteNombre} (${v.tipoComprobante || 'TICKET'} ${v.numeroComprobante || ''})`,
        monto: v.total.toNumber(),
        metodoPago: v.metodoPago
      });

      const costoVentaTotal = v.items.reduce((sum, item) => sum + (item.cantidad * item.costoUnitario.toNumber()), 0);
      if (costoVentaTotal > 0) {
        const itemNames = v.items.map(i => `${i.nombreProducto} (x${i.cantidad})`).join(', ');
        movimientos.push({
          id: `cogs-${v.id}`,
          fecha: v.fecha,
          tipo: 'Egreso',
          concepto: 'Costo de Ventas (COGS)',
          detalle: `Valor de stock consumido: ${itemNames}`,
          monto: costoVentaTotal,
          metodoPago: '-'
        });
      }
    });

    allGastos.forEach(g => {
      movimientos.push({
        id: `gasto-${g.id}`,
        fecha: g.fechaIngreso,
        tipo: 'Egreso',
        concepto: `Gasto: ${g.categoria}`,
        detalle: `${g.item} (Cant: ${g.cantidadInicial})`,
        monto: g.costoTotal.toNumber(),
        metodoPago: '-'
      });
    });

    movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    res.json({
      ingresos,
      egresos,
      gananciaNeta,
      capital,
      movimientos
    });

  } catch (error) {
    console.error('Error al obtener reporte de finanzas:', error);
    res.status(500).json({ error: 'Error al obtener reporte de finanzas.' });
  }
};
