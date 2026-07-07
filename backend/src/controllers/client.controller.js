import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── GET /api/clientes (Obtener todos los clientes) ──
export const obtenerClientes = async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      where: { activo: true },
      include: {
        historialPuntos: {
          orderBy: {
            fecha: 'desc'
          }
        },
        citas: {
          where: {
            estado: 'Pendiente',
            fecha: {
              gte: new Date()
            }
          },
          orderBy: {
            fecha: 'asc'
          },
          take: 1
        }
      },
      orderBy: { nombre: 'asc' },
    });
    res.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error al obtener los clientes.' });
  }
};

// ── POST /api/clientes (Crear cliente) ──
export const crearCliente = async (req, res) => {
  try {
    const { dni, nombre, telefono, correo, fechaNacimiento } = req.body;

    if (!dni || !nombre) {
      return res.status(400).json({ error: 'El DNI y el nombre son obligatorios.' });
    }

    // Verificar si ya existe
    const existe = await prisma.cliente.findUnique({
      where: { dni },
    });

    if (existe) {
      // Si existe pero está inactivo, lo reactivamos
      if (!existe.activo) {
        const clienteReactivado = await prisma.cliente.update({
          where: { id: existe.id },
          data: {
            activo: true,
            nombre,
            telefono: telefono || null,
            correo: correo || null,
            fechaNacimiento: fechaNacimiento || null
          }
        });
        return res.json({
          mensaje: 'Cliente reactivado exitosamente.',
          cliente: clienteReactivado
        });
      }
      return res.status(400).json({ error: 'Ya existe un cliente registrado con ese DNI.' });
    }

    const nuevoCliente = await prisma.cliente.create({
      data: {
        dni,
        nombre,
        telefono: telefono || null,
        correo: correo || null,
        fechaNacimiento: fechaNacimiento || null
      }
    });

    res.status(201).json({
      mensaje: 'Cliente registrado exitosamente.',
      cliente: nuevoCliente
    });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al registrar el cliente.' });
  }
};

// ── PUT /api/clientes/:id (Actualizar cliente) ──
export const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { dni, nombre, telefono, correo, fechaNacimiento } = req.body;

    const clienteId = parseInt(id);
    if (isNaN(clienteId)) {
      return res.status(400).json({ error: 'ID de cliente inválido.' });
    }

    // Verificar que el nuevo DNI no colisione
    if (dni) {
      const existeDni = await prisma.cliente.findFirst({
        where: {
          dni,
          NOT: { id: clienteId }
        }
      });
      if (existeDni) {
        return res.status(400).json({ error: 'Ya existe otro cliente con ese DNI.' });
      }
    }

    const clienteActualizado = await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        ...(dni && { dni }),
        ...(nombre && { nombre }),
        ...(telefono !== undefined && { telefono: telefono || null }),
        ...(correo !== undefined && { correo: correo || null }),
        ...(fechaNacimiento !== undefined && { fechaNacimiento: fechaNacimiento || null })
      }
    });

    res.json({
      mensaje: 'Cliente actualizado exitosamente.',
      cliente: clienteActualizado
    });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar el cliente.' });
  }
};

// ── DELETE /api/clientes/:id (Desactivar/eliminar lógicamente cliente) ──
export const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const clienteId = parseInt(id);
    if (isNaN(clienteId)) {
      return res.status(400).json({ error: 'ID de cliente inválido.' });
    }

    // Hacemos un borrado lógico (desactivación) para no romper el historial de ventas
    await prisma.cliente.update({
      where: { id: clienteId },
      data: { activo: false }
    });

    res.json({ mensaje: 'Cliente eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error al eliminar el cliente.' });
  }
};
