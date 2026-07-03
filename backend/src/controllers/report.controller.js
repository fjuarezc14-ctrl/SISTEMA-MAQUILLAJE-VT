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

    // 3. Stock Crítico (cantidad de productos con stock total <= 5)
    const productos = await prisma.producto.findMany({
      include: { lotes: true }
    });

    let stockCritico = 0;
    let capital = 0;
    const alertasVencimiento = [];

    const hoy = new Date();
    const limiteAlerta = new Date();
    limiteAlerta.setDate(hoy.getDate() + 45); // Alertas a 45 días

    productos.forEach(p => {
      const stockTotal = p.lotes.reduce((sum, l) => sum + l.stockActual, 0);
      if (stockTotal <= 5) {
        stockCritico++;
      }

      // Capital del inventario (precio de venta * stockActual de cada lote)
      capital += p.precio.toNumber() * stockTotal;

      // Alertas de vencimiento
      if (p.vencimiento && p.vencimiento !== '-') {
        // El formato es "DD/MM/YYYY" o "YYYY-MM-DD".
        // Intentaremos parsearlo de forma segura.
        let fechaVenc = null;
        if (p.vencimiento.includes('/')) {
          const [dia, mes, anio] = p.vencimiento.split('/');
          fechaVenc = new Date(`${anio}-${mes}-${dia}T00:00:00`);
        } else {
          fechaVenc = new Date(p.vencimiento);
        }

        if (!isNaN(fechaVenc.getTime())) {
          if (fechaVenc < hoy) {
            // Vencido
            alertasVencimiento.push({
              id: p.id,
              nombre: p.nombre,
              codigo: p.codigo,
              vencimiento: p.vencimiento,
              tipo: 'VENCIDO',
              detalle: `¡VENCIDO el ${p.vencimiento}!`
            });
          } else if (fechaVenc <= limiteAlerta) {
            // Próximo a vencer (dentro de 45 días)
            const diffTime = Math.abs(fechaVenc - hoy);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            alertasVencimiento.push({
              id: p.id,
              nombre: p.nombre,
              codigo: p.codigo,
              vencimiento: p.vencimiento,
              tipo: 'PROXIMO',
              detalle: `Próximo a vencer en ${diffDays} días (${p.vencimiento})`
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

    // 6. Capital en inventario (precio de venta * stockActual de cada lote de cada producto)
    const productos = await prisma.producto.findMany({
      include: { lotes: true }
    });
    let capital = 0;
    productos.forEach(p => {
      const stockTotal = p.lotes.reduce((sum, l) => sum + l.stockActual, 0);
      capital += p.precio.toNumber() * stockTotal;
    });

    res.json({
      ingresos,
      egresos,
      gananciaNeta,
      capital
    });

  } catch (error) {
    console.error('Error al obtener reporte de finanzas:', error);
    res.status(500).json({ error: 'Error al obtener reporte de finanzas.' });
  }
};
