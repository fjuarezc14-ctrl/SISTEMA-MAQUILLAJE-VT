import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuración general por defecto del negocio
const CONFIGURACION_DEFAULT = {
  montoAdelanto: 20.00,
  horarios: {
    lunesViernes: '08:00 a 20:00',
    sabados: '09:00 a 18:00',
    domingos: 'Cerrado'
  },
  metodosPago: {
    yape: {
      numero: '987654321',
      titular: 'GlowManager Pro — MakeUp Studio'
    },
    plin: {
      numero: '987654321',
      titular: 'GlowManager Pro — MakeUp Studio'
    },
    transferencia: {
      banco: 'BCP',
      cuenta: '193-98765432-0-12',
      cci: '002-193-0098765432012-14',
      titular: 'VALETEC Cosméticos & Belleza S.A.C.'
    }
  },
  servicios: [
    { id: 1, nombre: 'Maquillaje Social Glam', duracion: '1 hora', precioAprox: 70.00, descripcion: 'Preparación de piel, contornos, pestañas y acabado larga duración.' },
    { id: 2, nombre: 'Prueba de Novia Exclusiva', duracion: '1 hora 30 min', precioAprox: 120.00, descripcion: 'Asesoría de imagen, diseño personalizado y prueba completa.' },
    { id: 3, nombre: 'Maquillaje de Noche / Fiesta', duracion: '1 hora', precioAprox: 90.00, descripcion: 'Mirada impactante, glitter, fijación HD a prueba de agua.' },
    { id: 4, nombre: 'Maquillaje Express / Día', duracion: '45 min', precioAprox: 50.00, descripcion: 'Efecto no-makeup, piel luminosa y natural para el día.' },
    { id: 5, nombre: 'Perfilado y Diseño de Cejas', duracion: '30 min', precioAprox: 35.00, descripcion: 'Visagismo, depilación y sombreado semipermanente.' },
    { id: 6, nombre: 'Lifting de Pestañas + Tinte', duracion: '1 hora', precioAprox: 60.00, descripcion: 'Curvatura natural y nutrición con keratina.' }
  ]
};

// ── GET /api/public/configuracion ──
export const obtenerConfiguracion = (req, res) => {
  res.json(CONFIGURACION_DEFAULT);
};

// ── GET /api/public/disponibilidad?fecha=YYYY-MM-DD ──
export const obtenerDisponibilidad = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }

    const [yyyy, mm, dd] = fecha.split('-').map(Number);
    const targetDate = new Date(yyyy, mm - 1, dd);
    const dayOfWeek = targetDate.getDay(); // 0: Domingo, 1: Lunes, ... 6: Sábado

    // Si es domingo, cerrado
    if (dayOfWeek === 0) {
      return res.json({
        fecha,
        abierto: false,
        mensaje: 'Los días domingo el estudio permanece cerrado. Por favor selecciona de lunes a sábado.',
        turnos: []
      });
    }

    // Rango de turnos: L-V 08:00 a 19:00; Sáb 09:00 a 17:00
    const horaInicio = dayOfWeek === 6 ? 9 : 8;
    const horaFin = dayOfWeek === 6 ? 17 : 19;

    const horasSlots = [];
    for (let h = horaInicio; h <= horaFin; h++) {
      horasSlots.push(`${String(h).padStart(2, '0')}:00`);
    }

    const startOfDay = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    const endOfDay = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);

    const citasExistentes = await prisma.cita.findMany({
      where: {
        fecha: {
          gte: startOfDay,
          lte: endOfDay
        },
        estado: {
          notIn: ['Cancelado', 'Anulado']
        }
      },
      select: {
        fecha: true
      }
    });

    const horasOcupadas = new Set(
      citasExistentes.map(c => {
        const d = new Date(c.fecha);
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${min}`;
      })
    );

    const ahora = new Date();
    const esHoy = ahora.getFullYear() === yyyy && ahora.getMonth() === (mm - 1) && ahora.getDate() === dd;
    const horaActualNum = ahora.getHours() + ahora.getMinutes() / 60;

    const turnos = horasSlots.map(slot => {
      const [hStr, mStr] = slot.split(':');
      const slotNum = parseInt(hStr) + parseInt(mStr) / 60;

      let disponible = !horasOcupadas.has(slot);
      let motivo = '';

      if (horasOcupadas.has(slot)) {
        disponible = false;
        motivo = 'Ocupado';
      } else if (esHoy && slotNum <= horaActualNum) {
        disponible = false;
        motivo = 'Hora pasada';
      }

      return {
        hora: slot,
        disponible,
        motivo: disponible ? 'Disponible' : motivo
      };
    });

    res.json({
      fecha,
      abierto: true,
      turnos
    });

  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    res.status(500).json({ error: 'Error al consultar turnos disponibles.' });
  }
};

// ── POST /api/public/reservar ──
export const crearReservaPublica = async (req, res) => {
  try {
    const {
      clienteNombre,
      clienteDni,
      clienteTelefono,
      clienteCorreo,
      servicio,
      fecha,
      hora,
      metodoPagoReserva,
      notas
    } = req.body;

    if (!clienteNombre || !clienteDni || !clienteTelefono || !servicio || !fecha || !hora || !metodoPagoReserva) {
      return res.status(400).json({ error: 'Por favor completa todos los campos requeridos.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Debes adjuntar la captura del comprobante de pago de reserva.' });
    }

    const [yyyy, mm, dd] = fecha.split('-').map(Number);
    const [hh, min] = hora.split(':').map(Number);
    const targetDate = new Date(yyyy, mm - 1, dd, hh, min, 0);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Fecha u hora inválida.' });
    }

    if (targetDate.getDay() === 0) {
      return res.status(400).json({ error: 'Los domingos no hay atención disponible.' });
    }

    const citaConflicto = await prisma.cita.findFirst({
      where: {
        fecha: targetDate,
        estado: {
          notIn: ['Cancelado', 'Anulado']
        }
      }
    });

    if (citaConflicto) {
      return res.status(409).json({ error: `El turno ${hora} para la fecha ${fecha} ya fue reservado. Por favor elige otro horario.` });
    }

    const comprobanteUrl = `/uploads/comprobantes/${req.file.filename}`;

    let dbCliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { dni: clienteDni.trim() },
          { telefono: clienteTelefono.trim() }
        ]
      }
    });

    if (!dbCliente) {
      dbCliente = await prisma.cliente.create({
        data: {
          dni: clienteDni.trim(),
          nombre: clienteNombre.trim(),
          telefono: clienteTelefono.trim(),
          correo: clienteCorreo ? clienteCorreo.trim() : null
        }
      });
    } else {
      dbCliente = await prisma.cliente.update({
        where: { id: dbCliente.id },
        data: {
          nombre: clienteNombre.trim(),
          telefono: clienteTelefono.trim(),
          ...(clienteCorreo && { correo: clienteCorreo.trim() })
        }
      });
    }

    const servObj = CONFIGURACION_DEFAULT.servicios.find(s => s.nombre.toLowerCase().includes(servicio.toLowerCase()) || servicio.toLowerCase().includes(s.nombre.toLowerCase()));
    const precioRef = servObj ? servObj.precioAprox : 0.00;

    const nuevaCita = await prisma.cita.create({
      data: {
        fecha: targetDate,
        clienteNombre: clienteNombre.trim(),
        clienteId: dbCliente.id,
        servicio,
        estado: 'Por Validar',
        precioServicio: precioRef,
        montoAdelanto: 20.00,
        comprobanteUrl,
        metodoPagoReserva,
        notas: notas ? notas.trim() : null
      }
    });

    const telefonoEstudio = CONFIGURACION_DEFAULT.metodosPago.yape.numero;
    const msgWsp = `¡Hola *GlowManager Pro*! ✨ Acabo de registrar mi cita para *${servicio}* el día *${fecha}* a las *${hora}*.\n\n` +
      `👤 *Cliente:* ${clienteNombre.trim()}\n` +
      `💳 *Pago Reserva:* S/ 20.00 (${metodoPagoReserva})\n` +
      `📌 *N° Reserva:* #${nuevaCita.id}\n\n` +
      `Adjunté mi voucher en la web. ¡Quedo atenta a su confirmación! 💕`;

    const whatsappUrl = `https://wa.me/51${telefonoEstudio}?text=${encodeURIComponent(msgWsp)}`;

    res.status(201).json({
      mensaje: '¡Tu solicitud de reserva ha sido enviada con éxito! La confirmaremos en cuanto validemos tu comprobante.',
      cita: {
        id: nuevaCita.id,
        fecha,
        hora,
        servicio,
        estado: nuevaCita.estado,
        montoAdelanto: nuevaCita.montoAdelanto,
        comprobanteUrl
      },
      whatsappUrl
    });

  } catch (error) {
    console.error('Error al registrar reserva pública:', error);
    res.status(500).json({ error: error.message || 'Error al procesar la reserva.' });
  }
};