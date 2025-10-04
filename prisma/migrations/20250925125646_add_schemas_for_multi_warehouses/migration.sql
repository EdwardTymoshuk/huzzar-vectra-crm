-- CreateEnum
CREATE TYPE "LocationTransferStatus" AS ENUM ('REQUESTED', 'IN_TRANSIT', 'RECEIVED', 'REJECTED', 'CANCELED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "locationId" TEXT NOT NULL DEFAULT 'gdansk';

-- AlterTable
ALTER TABLE "WarehouseHistory" ADD COLUMN     "fromLocationId" TEXT,
ADD COLUMN     "locationTransferId" TEXT,
ADD COLUMN     "toLocationId" TEXT;

-- CreateTable
CREATE TABLE "WarehouseLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseLocation_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WarehouseLocation" (id, name, "createdAt", "updatedAt")
VALUES 
('gdansk', 'Gdańsk', NOW(), NOW()),
('gdynia', 'Gdynia', NOW(), NOW());

-- CreateTable
CREATE TABLE "LocationTransfer" (
    "id" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "status" "LocationTransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "LocationTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationTransferLine" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "itemType" "WarehouseItemType" NOT NULL,
    "warehouseItemId" TEXT,
    "materialDefinitionId" TEXT,
    "quantity" INTEGER,
    "unit" "MaterialUnit",
    "nameSnapshot" TEXT,
    "indexSnapshot" TEXT,

    CONSTRAINT "LocationTransferLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseLocation_name_key" ON "WarehouseLocation"("name");

-- CreateIndex
CREATE INDEX "LocationTransfer_fromLocationId_idx" ON "LocationTransfer"("fromLocationId");

-- CreateIndex
CREATE INDEX "LocationTransfer_toLocationId_idx" ON "LocationTransfer"("toLocationId");

-- CreateIndex
CREATE INDEX "LocationTransfer_status_idx" ON "LocationTransfer"("status");

-- CreateIndex
CREATE INDEX "LocationTransferLine_transferId_idx" ON "LocationTransferLine"("transferId");

-- CreateIndex
CREATE INDEX "LocationTransferLine_warehouseItemId_idx" ON "LocationTransferLine"("warehouseItemId");

-- CreateIndex
CREATE INDEX "LocationTransferLine_materialDefinitionId_idx" ON "LocationTransferLine"("materialDefinitionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseHistory" ADD CONSTRAINT "WarehouseHistory_locationTransferId_fkey" FOREIGN KEY ("locationTransferId") REFERENCES "LocationTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTransfer" ADD CONSTRAINT "LocationTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTransfer" ADD CONSTRAINT "LocationTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTransfer" ADD CONSTRAINT "LocationTransfer_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTransfer" ADD CONSTRAINT "LocationTransfer_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTransferLine" ADD CONSTRAINT "LocationTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "LocationTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTransferLine" ADD CONSTRAINT "LocationTransferLine_warehouseItemId_fkey" FOREIGN KEY ("warehouseItemId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTransferLine" ADD CONSTRAINT "LocationTransferLine_materialDefinitionId_fkey" FOREIGN KEY ("materialDefinitionId") REFERENCES "MaterialDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
