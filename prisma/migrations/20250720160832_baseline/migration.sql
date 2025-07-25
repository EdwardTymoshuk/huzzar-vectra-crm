-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('INSTALATION', 'SERVICE', 'OUTAGE');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '9-12', '12-15', '15-18', '18-21', '8-9', '9-10', '10-11', '11-12', '12-13', '13-14', '14-15', '15-16', '16-17', '17-18', '18-19', '19-20', '20-21');

-- CreateEnum
CREATE TYPE "WarehouseItemType" AS ENUM ('DEVICE', 'MATERIAL');

-- CreateEnum
CREATE TYPE "DeviceCategory" AS ENUM ('MODEM', 'DECODER_1_WAY', 'DECODER_2_WAY', 'OTHER', 'AMPLIFIER', 'ONT', 'UA');

-- CreateEnum
CREATE TYPE "MaterialUnit" AS ENUM ('PIECE', 'METER');

-- CreateEnum
CREATE TYPE "WarehouseStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'RETURNED', 'ASSIGNED_TO_ORDER', 'RETURNED_TO_OPERATOR', 'TRANSFER');

-- CreateEnum
CREATE TYPE "WarehouseAction" AS ENUM ('RECEIVED', 'ISSUED', 'RETURNED', 'RETURNED_TO_OPERATOR', 'TRANSFER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "identyficator" INTEGER,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TECHNICIAN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" "TimeSlot" NOT NULL,
    "contractRequired" BOOLEAN NOT NULL,
    "equipmentNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientPhoneNumber" TEXT,
    "notes" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "county" TEXT,
    "municipality" TEXT,
    "city" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "closedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "transferPending" BOOLEAN NOT NULL DEFAULT false,
    "transferToId" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderMaterial" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" "MaterialUnit" NOT NULL,

    CONSTRAINT "OrderMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderSettlementEntry" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OrderSettlementEntry_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "OrderEquipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,

    CONSTRAINT "OrderEquipment_pkey" PRIMARY KEY ("id")
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
    "unit" "MaterialUnit" NOT NULL DEFAULT 'PIECE',
    "price" DOUBLE PRECISION NOT NULL,
    "status" "WarehouseStatus" NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "alarmAlert" INTEGER DEFAULT 5,
    "index" TEXT,
    "warningAlert" INTEGER DEFAULT 10,
    "materialDefinitionId" TEXT,
    "transferPending" BOOLEAN NOT NULL DEFAULT false,
    "transferToId" TEXT,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceDefinition" (
    "id" TEXT NOT NULL,
    "category" "DeviceCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "alarmAlert" INTEGER DEFAULT 5,
    "warningAlert" INTEGER DEFAULT 10,
    "price" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "DeviceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alarmAlert" INTEGER DEFAULT 5,
    "index" TEXT,
    "warningAlert" INTEGER DEFAULT 10,
    "unit" "MaterialUnit" NOT NULL DEFAULT 'PIECE',
    "price" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "MaterialDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorDefinition" (
    "operator" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RateDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RateDefinition_pkey" PRIMARY KEY ("id")
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
    "quantity" INTEGER,
    "assignedOrderId" TEXT,

    CONSTRAINT "WarehouseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicianSettings" (
    "userId" TEXT NOT NULL,
    "workingDaysGoal" INTEGER NOT NULL,
    "revenueGoal" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_identyficator_key" ON "User"("identyficator");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_date_key" ON "Order"("orderNumber", "date");

-- CreateIndex
CREATE INDEX "OrderMaterial_orderId_idx" ON "OrderMaterial"("orderId");

-- CreateIndex
CREATE INDEX "OrderSettlementEntry_orderId_idx" ON "OrderSettlementEntry"("orderId");

-- CreateIndex
CREATE INDEX "OrderEquipment_orderId_idx" ON "OrderEquipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEquipment_orderId_warehouseId_key" ON "OrderEquipment"("orderId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_serialNumber_key" ON "Warehouse"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialDefinition_name_key" ON "MaterialDefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorDefinition_operator_key" ON "OperatorDefinition"("operator");

-- CreateIndex
CREATE UNIQUE INDEX "RateDefinition_code_key" ON "RateDefinition"("code");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_transferToId_fkey" FOREIGN KEY ("transferToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderMaterial" ADD CONSTRAINT "OrderMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderMaterial" ADD CONSTRAINT "OrderMaterial_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSettlementEntry" ADD CONSTRAINT "OrderSettlementEntry_code_fkey" FOREIGN KEY ("code") REFERENCES "RateDefinition"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSettlementEntry" ADD CONSTRAINT "OrderSettlementEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEquipment" ADD CONSTRAINT "OrderEquipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEquipment" ADD CONSTRAINT "OrderEquipment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_materialDefinitionId_fkey" FOREIGN KEY ("materialDefinitionId") REFERENCES "MaterialDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_transferToId_fkey" FOREIGN KEY ("transferToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseHistory" ADD CONSTRAINT "WarehouseHistory_assignedOrderId_fkey" FOREIGN KEY ("assignedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseHistory" ADD CONSTRAINT "WarehouseHistory_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseHistory" ADD CONSTRAINT "WarehouseHistory_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseHistory" ADD CONSTRAINT "WarehouseHistory_warehouseItemId_fkey" FOREIGN KEY ("warehouseItemId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianSettings" ADD CONSTRAINT "TechnicianSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

