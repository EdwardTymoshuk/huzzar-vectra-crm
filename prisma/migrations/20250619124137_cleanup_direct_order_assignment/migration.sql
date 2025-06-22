/*
  Warnings:

  - You are about to drop the column `assignedOrderId` on the `Warehouse` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Warehouse" DROP CONSTRAINT "Warehouse_assignedOrderId_fkey";

-- AlterTable
ALTER TABLE "Warehouse" DROP COLUMN "assignedOrderId";

-- CreateTable
CREATE TABLE "OrderEquipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,

    CONSTRAINT "OrderEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderEquipment_orderId_idx" ON "OrderEquipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEquipment_orderId_warehouseId_key" ON "OrderEquipment"("orderId", "warehouseId");

-- AddForeignKey
ALTER TABLE "OrderEquipment" ADD CONSTRAINT "OrderEquipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEquipment" ADD CONSTRAINT "OrderEquipment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
