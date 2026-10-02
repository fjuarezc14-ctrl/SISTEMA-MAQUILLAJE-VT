-- AlterTable
ALTER TABLE "Cita" ADD COLUMN     "personalId" INTEGER;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "cajaSesionId" INTEGER,
ADD COLUMN     "estadoCredito" TEXT,
ADD COLUMN     "metodoPagoDigital" TEXT,
ADD COLUMN     "montoDigital" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montoEfectivo" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "numeroComprobante" TEXT,
ADD COLUMN     "saldoPendiente" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tipoComprobante" TEXT NOT NULL DEFAULT 'TICKET',
ADD COLUMN     "tipoVenta" TEXT NOT NULL DEFAULT 'CONTADO';

-- CreateTable
CREATE TABLE "Servicio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'General',
    "precio" DECIMAL(10,2) NOT NULL,
    "duracion" TEXT DEFAULT '45 min',
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personal" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "cargo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CajaSesion" (
    "id" SERIAL NOT NULL,
    "montoApertura" DECIMAL(10,2) NOT NULL,
    "montoCierre" DECIMAL(10,2),
    "diferencia" DECIMAL(10,2),
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CajaSesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonoCredito" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,

    CONSTRAINT "AbonoCredito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackPromocion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioPromo" DECIMAL(10,2) NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackPromocion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialPuntos" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "puntos" INTEGER NOT NULL,
    "concepto" TEXT NOT NULL,
    "ventaId" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialPuntos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_cajaSesionId_fkey" FOREIGN KEY ("cajaSesionId") REFERENCES "CajaSesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonoCredito" ADD CONSTRAINT "AbonoCredito_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialPuntos" ADD CONSTRAINT "HistorialPuntos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
