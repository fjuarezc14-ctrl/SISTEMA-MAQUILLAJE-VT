-- CreateIndex
CREATE INDEX "Cita_fecha_estado_idx" ON "Cita"("fecha", "estado");

-- CreateIndex
CREATE INDEX "Cita_clienteId_idx" ON "Cita"("clienteId");

-- CreateIndex
CREATE INDEX "Venta_fecha_idx" ON "Venta"("fecha");

-- CreateIndex
CREATE INDEX "Venta_cajaSesionId_idx" ON "Venta"("cajaSesionId");
