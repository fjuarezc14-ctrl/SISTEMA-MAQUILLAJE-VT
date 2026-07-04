-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "citaId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Venta_citaId_key" ON "Venta"("citaId");

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE SET NULL ON UPDATE CASCADE;
