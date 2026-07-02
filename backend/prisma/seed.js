// backend/prisma/seed.js
// Datos de prueba equivalentes al defaultState de la maqueta aprobada

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de GlowManager Pro...');

  // ── 1. USUARIO ADMINISTRADOR ──────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin1234!', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@glowmanager.com' },
    update: {},
    create: {
      email: 'admin@glowmanager.com',
      nombre: 'Administrador',
      password: passwordHash,
      rol: 'ADMIN',
    },
  });
  console.log(`✅ Usuario admin creado: ${admin.email}`);

  // ── 2. PRODUCTOS E INVENTARIO ─────────────────────────────────────
  // Producto 1: Base Líquida Fenty
  const p1 = await prisma.producto.upsert({
    where: { codigo: 'FNTY-001' },
    update: {},
    create: {
      codigo: 'FNTY-001',
      nombre: 'Base Líquida Fenty',
      categoria: 'Rostro',
      precio: 45.00,
      vencimiento: '12/10/2026',
      lotes: {
        create: [
          { costo: 25.00, stockInicial: 24, stockActual: 24 },
        ],
      },
    },
  });
  console.log(`✅ Producto creado: ${p1.nombre}`);

  // Producto 2: Paleta Sombras Urban Decay (stock crítico)
  const p2 = await prisma.producto.upsert({
    where: { codigo: 'UD-NKD02' },
    update: {},
    create: {
      codigo: 'UD-NKD02',
      nombre: 'Paleta Sombras Urban Decay Naked',
      categoria: 'Ojos',
      precio: 59.00,
      vencimiento: '15/07/2026',
      lotes: {
        create: [
          { costo: 30.00, stockInicial: 10, stockActual: 2 },
        ],
      },
    },
  });
  console.log(`✅ Producto creado: ${p2.nombre}`);

  // Producto 3: Fijador Charlotte Tilbury (vencido)
  const p3 = await prisma.producto.upsert({
    where: { codigo: 'CT-FIJ01' },
    update: {},
    create: {
      codigo: 'CT-FIJ01',
      nombre: 'Fijador Charlotte Tilbury (Lote A)',
      categoria: 'Fijadores',
      precio: 35.00,
      vencimiento: '02/05/2026',
      lotes: {
        create: [
          { costo: 18.00, stockInicial: 5, stockActual: 5 },
        ],
      },
    },
  });
  console.log(`✅ Producto creado: ${p3.nombre}`);

  // Producto 4: Bolsas de Regalo (insumo de cortesía)
  const pBolsa = await prisma.producto.upsert({
    where: { codigo: 'BOLS-001' },
    update: {},
    create: {
      codigo: 'BOLS-001',
      nombre: 'Bolsas de Regalo GlowManager',
      categoria: 'Bolsas',
      precio: 0.00,
      vencimiento: null,
      lotes: {
        create: [
          { costo: 0.60, stockInicial: 50, stockActual: 50 },
        ],
      },
    },
  });
  console.log(`✅ Producto creado: ${pBolsa.nombre}`);

  // ── 3. CLIENTES ───────────────────────────────────────────────────
  const c1 = await prisma.cliente.upsert({
    where: { dni: '76543210' },
    update: {},
    create: {
      dni: '76543210',
      nombre: 'Lucía Fernández',
      telefono: '987654321',
      correo: 'lucia@email.com',
      totalComprado: 114.00,
      puntosFidelidad: 1,
    },
  });
  console.log(`✅ Cliente creado: ${c1.nombre}`);

  // ── 4. CITAS ──────────────────────────────────────────────────────
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

  const cita1 = await prisma.cita.upsert({
    where: { id: 1 },
    update: {},
    create: {
      fecha: new Date(`${hoyStr}T15:30:00`),
      clienteNombre: 'Camila Rodríguez',
      servicio: 'Maquillaje Social',
      estado: 'Pendiente',
    },
  });
  console.log(`✅ Cita creada: ${cita1.clienteNombre} — ${cita1.servicio}`);

  const cita2 = await prisma.cita.upsert({
    where: { id: 2 },
    update: {},
    create: {
      fecha: new Date('2026-06-15T10:00:00'),
      clienteNombre: 'Andrea Silva',
      servicio: 'Prueba de Novia',
      estado: 'Completado',
    },
  });
  console.log(`✅ Cita creada: ${cita2.clienteNombre} — ${cita2.servicio}`);

  // ── 5. GASTOS INTERNOS ────────────────────────────────────────────
  const g1 = await prisma.gastoInterno.upsert({
    where: { id: 1 },
    update: {},
    create: {
      categoria: 'Publicidad',
      item: 'Tarjetas de publicidad de mano',
      cantidadInicial: 100,
      cantidadActual: 40,
      costoTotal: 50.00,
      fechaIngreso: new Date('2026-06-10'),
    },
  });
  console.log(`✅ Gasto creado: ${g1.item}`);

  // ── 6. HISTORIAL DE VENTAS ────────────────────────────────────────
  // Venta 1 — Lucía Fernández (cliente registrada)
  const venta1 = await prisma.venta.upsert({
    where: { id: 1 },
    update: {},
    create: {
      fecha: new Date('2026-06-11T16:30:00'),
      clienteNombre: 'Lucía Fernández',
      clienteId: c1.id,
      metodoPago: 'Efectivo',
      total: 114.00,
      puntos: 1,
      llevaBolsa: true,
      items: {
        create: [
          {
            productoId: p1.id,
            nombreProducto: 'Base Líquida Fenty',
            cantidad: 1,
            precioUnitario: 45.00,
            costoUnitario: 25.00,
          },
          {
            productoId: p2.id,
            nombreProducto: 'Paleta Sombras Urban Decay Naked',
            cantidad: 1,
            precioUnitario: 59.00,
            costoUnitario: 30.00,
          },
        ],
      },
    },
  });
  console.log(`✅ Venta creada: ${venta1.clienteNombre} — S/ ${venta1.total}`);

  // Venta 2 — Cliente anónimo
  const venta2 = await prisma.venta.upsert({
    where: { id: 2 },
    update: {},
    create: {
      fecha: new Date('2026-06-12T09:15:00'),
      clienteNombre: 'Cliente Anónimo',
      clienteId: null,
      metodoPago: 'Yape',
      total: 45.00,
      puntos: 0,
      llevaBolsa: false,
      items: {
        create: [
          {
            productoId: p1.id,
            nombreProducto: 'Base Líquida Fenty',
            cantidad: 1,
            precioUnitario: 45.00,
            costoUnitario: 25.00,
          },
        ],
      },
    },
  });
  console.log(`✅ Venta creada: ${venta2.clienteNombre} — S/ ${venta2.total}`);

  console.log('\n🎉 Seed completado exitosamente.');
  console.log('📌 Credenciales de acceso:');
  console.log('   Email:    admin@glowmanager.com');
  console.log('   Password: Admin1234!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
