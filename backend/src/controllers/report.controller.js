import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper para obtener el rango del día actual (00:00:00 - 23:59:59) en la zona horaria del servidor
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// ── GET /api/dashboard (Métricas del Dashboard) ──
export const obtenerDashboard = async (req, res) => {
  try {
    // 1. Ingresos totales (Ventas)
    const ventas = await prisma.venta.findMany({
      select: { total: true }
    });
    const ingresos = ventas.reduce((sum, v) => sum + v.total.toNumber(), 0);

    // 2. Citas para hoy
    const { start, end } = getTodayRange();
    const citasHoy = await prisma.cita.count({
      where: {
        fecha: {
          gte: start,
          lte: end
        }
      }
    });

    // 3. Stock Crítico (cantidad de productos activos con stock total <= 5)
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: { lotes: true }
    });

    let stockCritico = 0;
    let capital = 0;
    const alertasVencimiento = [];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const finHoy = new Date();
    finHoy.setHours(23, 59, 59, 999);

    const limiteAlerta = new Date(finHoy);
    limiteAlerta.setDate(limiteAlerta.getDate() + 45); // Alertas a 45 días

    productos.forEach(p => {
      const stockTotal = p.lotes.reduce((sum, l) => sum + l.stockActual, 0);
      if (stockTotal <= 5) {
        stockCritico++;
      }

      // Capital del inventario (precio de venta * stockActual de cada lote)
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
            // Vencido antes de hoy
            alertasVencimiento.push({
              id: p.id,
              nombre: p.nombre,
              codigo: p.codigo,
              vencimiento: p.vencimiento,
              tipo: 'VENCIDO',
              detalle: `¡VENCIDO el ${p.vencimiento}!`
            });
          } else if (fechaVenc <= limiteAlerta) {
            // Próximo a vencer (dentro de 45 días o vence hoy)
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

    res.json({
      ingresos,
      citasHoy,
      stockCritico,
      capital,
      alertasVencimiento
    });

  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    res.status(500).json({ error: 'Error al obtener datos del dashboard.' });
  }
};

// ── GET /api/finanzas (Métricas de Finanzas y Balance) ──
export const obtenerFinanzas = async (req, res) => {
  try {
    // 1. Ingresos totales (Ventas)
    const ventas = await prisma.venta.findMany({
      select: { total: true }
    });
    const ingresos = ventas.reduce((sum, v) => sum + v.total.toNumber(), 0);

    // 2. Costo de ventas (sumatoria de cantidad * costo de los items vendidos)
    const itemsVendidos = await prisma.itemVenta.findMany({
      select: { cantidad: true, costoUnitario: true }
    });
    const costoVentas = itemsVendidos.reduce((sum, item) => sum + (item.cantidad * item.costoUnitario.toNumber()), 0);

    // 3. Gastos internos (costoTotal de todos los gastos registrados)
    const gastosInternos = await prisma.gastoInterno.findMany({
      select: { costoTotal: true }
    });
    const totalGastos = gastosInternos.reduce((sum, g) => sum + g.costoTotal.toNumber(), 0);

    // 4. Egresos Totales
    const egresos = costoVentas + totalGastos;

    // 5. Ganancia Neta Real
    const gananciaNeta = ingresos - egresos;

    // 6. Capital en inventario (precio de venta * stockActual de cada lote de cada producto activo)
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: { lotes: true }
    });
    let capital = 0;
    productos.forEach(p => {
      const stockTotal = p.lotes.reduce((sum, l) => sum + l.stockActual, 0);
      capital += p.precio.toNumber() * stockTotal;
    });

    // 7. Compilar Libro Mayor (Movimientos cronológicos)
    const allVentas = await prisma.venta.findMany({
      include: { items: true },
      orderBy: { fecha: 'desc' }
    });

    const allGastos = await prisma.gastoInterno.findMany({
      orderBy: { fechaIngreso: 'desc' }
    });

    const movimientos = [];

    // Agregar ingresos y costos de ventas
    allVentas.forEach(v => {
      // Movimiento de Ingreso
      const esCita = v.citaId !== null;
      movimientos.push({
        id: `ingreso-${v.id}`,
        fecha: v.fecha,
        tipo: 'Ingreso',
        concepto: esCita ? 'Servicio de Cita' : 'Venta POS',
        detalle: `Cliente: ${v.clienteNombre}`,
        monto: v.total.toNumber(),
        metodoPago: v.metodoPago
      });

      // Movimiento de Egreso: Costo de Ventas (COGS)
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

    // Agregar egresos de gastos internos
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

    // Ordenar movimientos por fecha descendente
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
