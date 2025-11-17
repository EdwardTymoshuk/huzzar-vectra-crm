-- DropForeignKey
ALTER TABLE "Warehouse" DROP CONSTRAINT "Warehouse_locationId_fkey";

-- AlterTable
ALTER TABLE "Warehouse" ALTER COLUMN "locationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
