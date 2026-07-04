-- AlterTable
ALTER TABLE "Cita" ADD COLUMN     "ingresoRegistrado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precioServicio" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "GastoInterno" ADD COLUMN     "productoId" INTEGER;

-- CreateTable
CREATE TABLE "CitaInsumo" (
    "id" SERIAL NOT NULL,
    "citaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "CitaInsumo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CitaInsumo" ADD CONSTRAINT "CitaInsumo_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitaInsumo" ADD CONSTRAINT "CitaInsumo_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoInterno" ADD CONSTRAINT "GastoInterno_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
