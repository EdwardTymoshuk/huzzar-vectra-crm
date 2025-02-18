-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "Standard" AS ENUM ('W1', 'W2', 'W3', 'W4', 'W5', 'W6');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('EIGHT_NINE', 'EIGHT_TEN', 'EIGHT_ELEVEN', 'EIGHT_TWELVE', 'NINE_TEN', 'TEN_ELEVEN', 'TEN_TWELVE', 'ELEVEN_TWELVE', 'ELEVEN_FOURTEEN', 'TWELVE_THIRTEEN', 'TWELVE_FOURTEEN', 'TWELVE_SIXTEEN', 'THIRTEEN_FOURTEEN', 'FOURTEEN_FIFTEEN', 'FOURTEEN_SIXTEEN', 'FOURTEEN_SEVENTEEN', 'FIFTEEN_SIXTEEN', 'SIXTEEN_SEVENTEEN', 'SIXTEEN_TWENTY', 'SEVENTEEN_EIGHTEEN', 'SEVENTEEN_TWENTY', 'EIGHTEEN_NINETEEN', 'EIGHTEEN_TWENTY', 'NINETEEN_TWENTY');

-- CreateEnum
CREATE TYPE "WarehouseItemType" AS ENUM ('DEVICE', 'MATERIAL');

-- CreateEnum
CREATE TYPE "DeviceCategory" AS ENUM ('MODEM', 'DECODER', 'OTHER', 'AMPLIFIER');

-- CreateEnum
CREATE TYPE "MaterialUnit" AS ENUM ('PIECE', 'METER');

-- CreateEnum
CREATE TYPE "WarehouseStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'RETURNED', 'ASSIGNED_TO_ORDER');

-- CreateEnum
CREATE TYPE "WarehouseAction" AS ENUM ('RECEIVED', 'ISSUED', 'RETURNED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" "TimeSlot" NOT NULL,
    "standard" "Standard" NOT NULL,
    "contractRequired" BOOLEAN NOT NULL,
    "equipmentNeeded" TEXT[],
    "clientPhoneNumber" TEXT,
    "notes" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "county" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusBefore" "OrderStatus" NOT NULL,
    "statusAfter" "OrderStatus" NOT NULL,
    "notes" TEXT,
    "equipmentUsed" TEXT[],

    CONSTRAINT "OrderHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "itemType" "WarehouseItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DeviceCategory",
    "subcategory" TEXT,
    "serialNumber" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" "MaterialUnit",
    "price" DOUBLE PRECISION NOT NULL,
    "status" "WarehouseStatus" NOT NULL,
    "assignedToId" TEXT,
    "assignedOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseHistory" (
    "id" TEXT NOT NULL,
    "warehouseItemId" TEXT NOT NULL,
    "action" "WarehouseAction" NOT NULL,
    "performedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "actionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "WarehouseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_serialNumber_key" ON "Warehouse"("serialNumber");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_assignedOrderId_fkey" FOREIGN KEY ("assignedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseHistory" ADD CONSTRAINT "WarehouseHistory_warehouseItemId_fkey" FOREIGN KEY ("warehouseItemId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseHistory" ADD CONSTRAINT "WarehouseHistory_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseHistory" ADD CONSTRAINT "WarehouseHistory_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
