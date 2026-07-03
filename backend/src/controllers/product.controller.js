import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── GET /api/productos (Obtener todos los productos con sus lotes) ──
export const obtenerProductos = async (req, res) => {
  try {
    const productos = await prisma.producto.findMany({
      include: {
        lotes: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
    
    // Mapear el estado (Agotado, Stock Crítico, Disponible) dinámicamente antes de enviar
    const productosConEstado = productos.map(p => {
      const stockTotal = p.lotes.reduce((sum, l) => sum + l.stockActual, 0);
      let estado = 'Disponible';
      if (stockTotal === 0) {
        estado = 'Agotado';
      } else if (stockTotal <= 5) {
        estado = 'Stock Crítico';
      }
      return {
        ...p,
        stock: stockTotal,
        estado
      };
    });

    res.json(productosConEstado);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener los productos.' });
  }
};

// ── POST /api/productos (Crear producto con lote inicial) ──
export const crearProducto = async (req, res) => {
  try {
    const { codigo, nombre, categoria, precio, costo, stock, vencimiento } = req.body;

    if (!codigo || !nombre || !categoria || precio === undefined || costo === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    // Verificar si ya existe el código
    const existe = await prisma.producto.findUnique({
      where: { codigo: codigo.toUpperCase() },
    });

    if (existe) {
      return res.status(400).json({ error: `El código de producto ${codigo} ya existe.` });
    }

    const nuevoProducto = await prisma.producto.create({
      data: {
        codigo: codigo.toUpperCase(),
        nombre,
        categoria,
        precio: parseFloat(precio),
        vencimiento: vencimiento || null,
        lotes: {
          create: {
            costo: parseFloat(costo),
            stockInicial: parseInt(stock),
            stockActual: parseInt(stock),
          }
        }
      },
      include: {
        lotes: true,
      }
    });

    res.status(201).json({
      mensaje: 'Producto creado exitosamente.',
      producto: nuevoProducto
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear el producto.' });
  }
};

// ── PUT /api/productos/:id (Actualizar datos generales del producto) ──
export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, categoria, precio, vencimiento } = req.body;

    const productoId = parseInt(id);
    if (isNaN(productoId)) {
      return res.status(400).json({ error: 'ID de producto inválido.' });
    }

    // Verificar si el código nuevo colisiona con otro producto
    if (codigo) {
      const existeCodigo = await prisma.producto.findFirst({
        where: {
          codigo: codigo.toUpperCase(),
          NOT: { id: productoId }
        }
      });
      if (existeCodigo) {
        return res.status(400).json({ error: `El código ${codigo} ya está en uso por otro producto.` });
      }
    }

    const productoActualizado = await prisma.producto.update({
      where: { id: productoId },
      data: {
        ...(codigo && { codigo: codigo.toUpperCase() }),
        ...(nombre && { nombre }),
        ...(categoria && { categoria }),
        ...(precio !== undefined && { precio: parseFloat(precio) }),
        ...(vencimiento !== undefined && { vencimiento: vencimiento || null }),
      },
      include: {
        lotes: true
      }
    });

    res.json({
      mensaje: 'Producto actualizado exitosamente.',
      producto: productoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar el producto.' });
  }
};

// ── DELETE /api/productos/:id (Eliminar producto) ──
export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const productoId = parseInt(id);
    if (isNaN(productoId)) {
      return res.status(400).json({ error: 'ID de producto inválido.' });
    }

    // Se eliminarán en cascada los lotes asociados por la configuración de Prisma
    await prisma.producto.delete({
      where: { id: productoId },
    });

    res.json({ mensaje: 'Producto eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar el producto. Asegúrese de que no esté asociado a ninguna venta.' });
  }
};

// ── POST /api/productos/:id/lotes (Agregar un lote a un producto existente) ──
export const agregarLote = async (req, res) => {
  try {
    const { id } = req.params;
    const { costo, stock } = req.body;

    const productoId = parseInt(id);
    if (isNaN(productoId)) {
      return res.status(400).json({ error: 'ID de producto inválido.' });
    }

    if (costo === undefined || stock === undefined || parseInt(stock) <= 0) {
      return res.status(400).json({ error: 'El costo y stock son requeridos, y el stock debe ser mayor a 0.' });
    }

    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const nuevoLote = await prisma.lote.create({
      data: {
        productoId,
        costo: parseFloat(costo),
        stockInicial: parseInt(stock),
        stockActual: parseInt(stock)
      }
    });

    res.status(201).json({
      mensaje: 'Lote agregado exitosamente.',
      lote: nuevoLote
    });
  } catch (error) {
    console.error('Error al agregar lote:', error);
    res.status(500).json({ error: 'Error al agregar el lote al producto.' });
  }
};
