-- AlterTable
ALTER TABLE "OrderExtraDevice" ADD COLUMN     "warehouseId" TEXT;

-- AddForeignKey
ALTER TABLE "OrderExtraDevice" ADD CONSTRAINT "OrderExtraDevice_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
