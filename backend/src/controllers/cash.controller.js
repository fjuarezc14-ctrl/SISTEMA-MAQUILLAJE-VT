import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── GET /api/caja/estado ──
export const obtenerEstadoCaja = async (req, res) => {
  try {
    const sesionAbierta = await prisma.cajaSesion.findFirst({
      where: { estado: 'ABIERTA' },
      orderBy: { fechaApertura: 'desc' },
      include: {
        ventas: {
          include: {
            items: true
          }
        }
      }
    });

    if (!sesionAbierta) {
      return res.json({
        abierta: false,
        sesion: null,
        resumen: null
      });
    }

    const fechaDesde = sesionAbierta.fechaApertura;

    // 1. Ventas realizadas en esta sesión
    const ventas = await prisma.venta.findMany({
      where: {
        OR: [
          { cajaSesionId: sesionAbierta.id },
          { fecha: { gte: fechaDesde } }
        ]
      },
      include: {
        items: true,
        abonosCredito: true
      },
      orderBy: { fecha: 'desc' }
    });

    let totalVentasEfectivo = 0;
    let totalVentasDigital = 0;
    let totalVentasCredito = 0;
    let totalVentas = 0;

    ventas.forEach((v) => {
      const tot = parseFloat(v.total) || 0;
      totalVentas += tot;

      if (v.tipoVenta === 'CREDITO') {
        totalVentasCredito += tot;
        // Si pagó un abono inicial en efectivo o digital
        totalVentasEfectivo += parseFloat(v.montoEfectivo) || 0;
        totalVentasDigital += parseFloat(v.montoDigital) || 0;
      } else {
        // Venta al contado
        if (v.metodoPago === 'Pago Mixto') {
          totalVentasEfectivo += parseFloat(v.montoEfectivo) || 0;
          totalVentasDigital += parseFloat(v.montoDigital) || 0;
        } else if (v.metodoPago === 'Efectivo') {
          totalVentasEfectivo += tot;
        } else {
          totalVentasDigital += tot;
        }
      }
    });

    // 2. Abonos a créditos recibidos en la sesión
    const abonos = await prisma.abonoCredito.findMany({
      where: { fecha: { gte: fechaDesde } }
    });

    let totalAbonosEfectivo = 0;
    let totalAbonosDigital = 0;
    abonos.forEach((a) => {
      const m = parseFloat(a.monto) || 0;
      if (a.metodoPago === 'Efectivo') {
        totalAbonosEfectivo += m;
      } else {
        totalAbonosDigital += m;
      }
    });

    // 3. Gastos / Salidas de caja en efectivo
    const gastos = await prisma.gastoInterno.findMany({
      where: { fechaIngreso: { gte: fechaDesde } }
    });
    const totalGastosEfectivo = gastos.reduce((sum, g) => sum + (parseFloat(g.costoTotal) || 0), 0);

    const montoApertura = parseFloat(sesionAbierta.montoApertura) || 0;
    const saldoEfectivoEsperado = montoApertura + totalVentasEfectivo + totalAbonosEfectivo - totalGastosEfectivo;

    res.json({
      abierta: true,
      sesion: sesionAbierta,
      resumen: {
        montoApertura,
        totalVentas,
        totalVentasEfectivo,
        totalVentasDigital,
        totalVentasCredito,
        totalAbonosEfectivo,
        totalAbonosDigital,
        totalGastosEfectivo,
        saldoEfectivoEsperado,
        cantidadVentas: ventas.length
      },
      ventas: ventas.slice(0, 30)
    });
  } catch (error) {
    console.error('Error al obtener estado de caja:', error);
    res.status(500).json({ error: 'Error al consultar estado de caja.' });
  }
};

// ── POST /api/caja/abrir ──
export const abrirCaja = async (req, res) => {
  try {
    const { montoApertura, notas } = req.body;

    const sesionActiva = await prisma.cajaSesion.findFirst({
      where: { estado: 'ABIERTA' }
    });

    if (sesionActiva) {
      return res.status(400).json({ error: 'Ya existe una sesión de caja abierta. Debe cerrarla antes de iniciar una nueva.' });
    }

    const monto = parseFloat(montoApertura || 0);
    if (isNaN(monto) || monto < 0) {
      return res.status(400).json({ error: 'El monto inicial de apertura debe ser un número válido mayor o igual a 0.' });
    }

    const nuevaSesion = await prisma.cajaSesion.create({
      data: {
        montoApertura: monto,
        estado: 'ABIERTA',
        notas: notas?.trim() || 'Apertura de turno'
      }
    });

    res.status(201).json({
      mensaje: 'Caja abierta exitosamente. ¡Buen turno!',
      sesion: nuevaSesion
    });
  } catch (error) {
    console.error('Error al abrir caja:', error);
    res.status(500).json({ error: 'Error al abrir caja.' });
  }
};

// ── POST /api/caja/cerrar ──
export const cerrarCaja = async (req, res) => {
  try {
    const { montoCierre, notas } = req.body;

    const sesionActiva = await prisma.cajaSesion.findFirst({
      where: { estado: 'ABIERTA' },
      orderBy: { fechaApertura: 'desc' }
    });

    if (!sesionActiva) {
      return res.status(400).json({ error: 'No hay ninguna sesión de caja abierta actualmente.' });
    }

    const efectivoFisico = parseFloat(montoCierre);
    if (isNaN(efectivoFisico) || efectivoFisico < 0) {
      return res.status(400).json({ error: 'Debe ingresar el dinero en efectivo contado en caja física.' });
    }

    // Calcular esperado
    const fechaDesde = sesionActiva.fechaApertura;
    const ventas = await prisma.venta.findMany({
      where: {
        OR: [
          { cajaSesionId: sesionActiva.id },
          { fecha: { gte: fechaDesde } }
        ]
      }
    });

    let totalVentasEfectivo = 0;
    let totalVentasDigital = 0;
    ventas.forEach((v) => {
      const tot = parseFloat(v.total) || 0;
      if (v.tipoVenta === 'CREDITO') {
        totalVentasEfectivo += parseFloat(v.montoEfectivo) || 0;
        totalVentasDigital += parseFloat(v.montoDigital) || 0;
      } else if (v.metodoPago === 'Pago Mixto') {
        totalVentasEfectivo += parseFloat(v.montoEfectivo) || 0;
        totalVentasDigital += parseFloat(v.montoDigital) || 0;
      } else if (v.metodoPago === 'Efectivo') {
        totalVentasEfectivo += tot;
      } else {
        totalVentasDigital += tot;
      }
    });

    const abonos = await prisma.abonoCredito.findMany({
      where: { fecha: { gte: fechaDesde } }
    });
    const totalAbonosEfectivo = abonos.filter(a => a.metodoPago === 'Efectivo').reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);

    const gastos = await prisma.gastoInterno.findMany({
      where: { fechaIngreso: { gte: fechaDesde } }
    });
    const totalGastosEfectivo = gastos.reduce((sum, g) => sum + (parseFloat(g.costoTotal) || 0), 0);

    const montoApertura = parseFloat(sesionActiva.montoApertura) || 0;
    const saldoEfectivoEsperado = montoApertura + totalVentasEfectivo + totalAbonosEfectivo - totalGastosEfectivo;
    const diferencia = efectivoFisico - saldoEfectivoEsperado;

    // Vincular todas las ventas de la sesión que no tenían id
    await prisma.venta.updateMany({
      where: {
        fecha: { gte: fechaDesde },
        cajaSesionId: null
      },
      data: {
        cajaSesionId: sesionActiva.id
      }
    });

    const sesionCerrada = await prisma.cajaSesion.update({
      where: { id: sesionActiva.id },
      data: {
        montoCierre: efectivoFisico,
        diferencia,
        estado: 'CERRADA',
        fechaCierre: new Date(),
        notas: notas?.trim() || sesionActiva.notas
      }
    });

    res.json({
      mensaje: 'Cierre de caja completado exitosamente.',
      sesion: sesionCerrada,
      resumenCierre: {
        montoApertura,
        totalVentasEfectivo,
        totalVentasDigital,
        totalAbonosEfectivo,
        totalGastosEfectivo,
        saldoEfectivoEsperado,
        efectivoFisicoContado: efectivoFisico,
        diferencia,
        fechaApertura: sesionActiva.fechaApertura,
        fechaCierre: sesionCerrada.fechaCierre
      }
    });
  } catch (error) {
    console.error('Error al cerrar caja:', error);
    res.status(500).json({ error: 'Error al realizar el cierre de caja.' });
  }
};

// ── GET /api/caja/historial ──
export const obtenerHistorialCajas = async (req, res) => {
  try {
    const historial = await prisma.cajaSesion.findMany({
      where: { estado: 'CERRADA' },
      orderBy: { fechaCierre: 'desc' },
      take: 20
    });
    res.json(historial);
  } catch (error) {
    console.error('Error al obtener historial de caja:', error);
    res.status(500).json({ error: 'Error al consultar historial de cajas.' });
  }
};
