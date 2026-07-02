import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const counts = {
  usuarios:  await prisma.usuario.count(),
  productos: await prisma.producto.count(),
  lotes:     await prisma.lote.count(),
  clientes:  await prisma.cliente.count(),
  ventas:    await prisma.venta.count(),
  itemsVenta:await prisma.itemVenta.count(),
  citas:     await prisma.cita.count(),
  gastos:    await prisma.gastoInterno.count(),
};
console.table(counts);
await prisma.$disconnect();
