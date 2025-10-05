-- AddForeignKey
ALTER TABLE "WarehouseHistory" ADD CONSTRAINT "WarehouseHistory_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseHistory" ADD CONSTRAINT "WarehouseHistory_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
