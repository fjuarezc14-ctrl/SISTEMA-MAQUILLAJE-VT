import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── GET /api/citas (Obtener todas las citas) ──
export const obtenerCitas = async (req, res) => {
  try {
    const citas = await prisma.cita.findMany({
      orderBy: [
        { fecha: 'asc' },
        { hora: 'asc' }
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
    const { fecha, hora, clienteNombre, servicio, estado, notas } = req.body;

    const citaId = parseInt(id);
    if (isNaN(citaId)) {
      return res.status(400).json({ error: 'ID de cita inválido.' });
    }

    // Construimos la nueva fecha si se proporcionan fecha y hora
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

    const citaActualizada = await prisma.cita.update({
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

    res.json({
      mensaje: 'Cita actualizada exitosamente.',
      cita: citaActualizada
    });
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({ error: 'Error al actualizar la cita.' });
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
