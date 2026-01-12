-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "vectra";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "vectra"."VectraOrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'COMPLETED', 'NOT_COMPLETED');

-- CreateEnum
CREATE TYPE "vectra"."VectraOrderType" AS ENUM ('INSTALATION', 'SERVICE', 'OUTAGE');

-- CreateEnum
CREATE TYPE "vectra"."VectraOrderCreatedSource" AS ENUM ('PLANNER', 'MANUAL');

-- CreateEnum
CREATE TYPE "vectra"."VectraTimeSlot" AS ENUM ('8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '9-12', '12-15', '15-18', '18-21');

-- CreateEnum
CREATE TYPE "vectra"."VectraWarehouseStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'RETURNED', 'ASSIGNED_TO_ORDER', 'RETURNED_TO_OPERATOR', 'TRANSFER', 'COLLECTED_FROM_CLIENT');

-- CreateEnum
CREATE TYPE "vectra"."VectraWarehouseItemType" AS ENUM ('DEVICE', 'MATERIAL');

-- CreateEnum
CREATE TYPE "vectra"."VectraDeviceCategory" AS ENUM ('MODEM_HFC', 'MODEM_GPON', 'DECODER_1_WAY', 'DECODER_2_WAY', 'NETWORK_DEVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "vectra"."VectraMaterialUnit" AS ENUM ('PIECE', 'METER');

-- CreateEnum
CREATE TYPE "vectra"."VectraWarehouseAction" AS ENUM ('RECEIVED', 'ISSUED', 'RETURNED', 'RETURNED_TO_OPERATOR', 'RETURNED_TO_TECHNICIAN', 'TRANSFER', 'COLLECTED_FROM_CLIENT', 'ASSIGNED_TO_ORDER', 'ISSUED_TO_CLIENT');

-- CreateEnum
CREATE TYPE "vectra"."VectraServiceType" AS ENUM ('DTV', 'NET', 'TEL', 'ATV');

-- CreateEnum
CREATE TYPE "vectra"."VectraLocationTransferStatus" AS ENUM ('REQUESTED', 'IN_TRANSIT', 'RECEIVED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "vectra"."VectraDeviceSource" AS ENUM ('WAREHOUSE', 'CLIENT');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "identyficator" INTEGER,
    "role" "public"."Role" NOT NULL DEFAULT 'TECHNICIAN',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GlobalUserSettings" (
    "userId" TEXT NOT NULL,
    "language" TEXT,
    "darkMode" BOOLEAN DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalUserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."Module" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserModule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,

    CONSTRAINT "UserModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraUser" (
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VectraUser_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "vectra"."VectraTechnicianSettings" (
    "userId" TEXT NOT NULL,
    "workingDaysGoal" INTEGER NOT NULL,
    "revenueGoal" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VectraTechnicianSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "vectra"."VectraRateDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "VectraRateDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraOperatorDefinition" (
    "operator" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "vectra"."VectraOrder" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" "vectra"."VectraTimeSlot" NOT NULL,
    "clientPhoneNumber" TEXT,
    "notes" TEXT,
    "status" "vectra"."VectraOrderStatus" NOT NULL DEFAULT 'PENDING',
    "county" TEXT,
    "municipality" TEXT,
    "city" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "postalCode" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdSource" "vectra"."VectraOrderCreatedSource" NOT NULL DEFAULT 'PLANNER',
    "operator" TEXT NOT NULL,
    "type" "vectra"."VectraOrderType" NOT NULL,
    "closedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "transferPending" BOOLEAN NOT NULL DEFAULT false,
    "transferToId" TEXT,
    "completedAt" TIMESTAMP(3),
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "previousOrderId" TEXT,

    CONSTRAINT "VectraOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraOrderMaterial" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" "vectra"."VectraMaterialUnit" NOT NULL,

    CONSTRAINT "VectraOrderMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraOrderSettlementEntry" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "VectraOrderSettlementEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraOrderService" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "vectra"."VectraServiceType" NOT NULL,
    "deviceId" TEXT,
    "serialNumber" TEXT,
    "deviceType" "vectra"."VectraDeviceCategory",
    "deviceSource" "vectra"."VectraDeviceSource",
    "deviceName" TEXT,
    "deviceId2" TEXT,
    "serialNumber2" TEXT,
    "deviceType2" "vectra"."VectraDeviceCategory",
    "device2Source" "vectra"."VectraDeviceSource",
    "deviceName2" TEXT,
    "extraDevicesCount" INTEGER DEFAULT 0,
    "speedTest" TEXT,
    "usDbmDown" DOUBLE PRECISION,
    "usDbmUp" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "VectraOrderService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraOrderHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusBefore" "vectra"."VectraOrderStatus" NOT NULL,
    "statusAfter" "vectra"."VectraOrderStatus" NOT NULL,
    "notes" TEXT,
    "equipmentUsed" TEXT[],

    CONSTRAINT "VectraOrderHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraOrderEquipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,

    CONSTRAINT "VectraOrderEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraOrderExtraDevice" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "source" "vectra"."VectraDeviceSource" NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT,
    "category" "vectra"."VectraDeviceCategory",

    CONSTRAINT "VectraOrderExtraDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraWarehouse" (
    "id" TEXT NOT NULL,
    "itemType" "vectra"."VectraWarehouseItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "category" "vectra"."VectraDeviceCategory",
    "serialNumber" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" "vectra"."VectraMaterialUnit" NOT NULL DEFAULT 'PIECE',
    "price" DOUBLE PRECISION NOT NULL,
    "status" "vectra"."VectraWarehouseStatus" NOT NULL,
    "assignedToId" TEXT,
    "transferToId" TEXT,
    "transferPending" BOOLEAN NOT NULL DEFAULT false,
    "materialDefinitionId" TEXT,
    "locationId" TEXT,
    "index" TEXT,
    "alarmAlert" INTEGER DEFAULT 5,
    "warningAlert" INTEGER DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VectraWarehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraWarehouseHistory" (
    "id" TEXT NOT NULL,
    "warehouseItemId" TEXT NOT NULL,
    "action" "vectra"."VectraWarehouseAction" NOT NULL,
    "performedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "assignedOrderId" TEXT,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "locationTransferId" TEXT,
    "quantity" INTEGER,
    "notes" TEXT,
    "actionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VectraWarehouseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraLocationTransfer" (
    "id" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "status" "vectra"."VectraLocationTransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VectraLocationTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraLocationTransferLine" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "itemType" "vectra"."VectraWarehouseItemType" NOT NULL,
    "warehouseItemId" TEXT,
    "materialDefinitionId" TEXT,
    "quantity" INTEGER,
    "unit" "vectra"."VectraMaterialUnit",
    "nameSnapshot" TEXT,
    "indexSnapshot" TEXT,
    "category" "vectra"."VectraDeviceCategory",

    CONSTRAINT "VectraLocationTransferLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraMaterialDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "index" TEXT,
    "unit" "vectra"."VectraMaterialUnit" NOT NULL DEFAULT 'PIECE',
    "price" DOUBLE PRECISION DEFAULT 0,
    "alarmAlert" INTEGER DEFAULT 5,
    "warningAlert" INTEGER DEFAULT 10,

    CONSTRAINT "VectraMaterialDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraDeviceDefinition" (
    "id" TEXT NOT NULL,
    "category" "vectra"."VectraDeviceCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION DEFAULT 0,
    "alarmAlert" INTEGER DEFAULT 5,
    "warningAlert" INTEGER DEFAULT 10,

    CONSTRAINT "VectraDeviceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraTechnicianMaterialDeficit" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "materialDefinitionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VectraTechnicianMaterialDeficit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vectra"."VectraWarehouseLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VectraWarehouseLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_UserLocations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserLocations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_identyficator_key" ON "public"."User"("identyficator");

-- CreateIndex
CREATE UNIQUE INDEX "UserLocation_name_key" ON "public"."UserLocation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Module_name_key" ON "public"."Module"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Module_code_key" ON "public"."Module"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserModule_userId_moduleId_key" ON "public"."UserModule"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "VectraRateDefinition_code_key" ON "vectra"."VectraRateDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VectraOperatorDefinition_operator_key" ON "vectra"."VectraOperatorDefinition"("operator");

-- CreateIndex
CREATE UNIQUE INDEX "VectraOrder_orderNumber_city_street_attemptNumber_key" ON "vectra"."VectraOrder"("orderNumber", "city", "street", "attemptNumber");

-- CreateIndex
CREATE INDEX "VectraOrderMaterial_orderId_idx" ON "vectra"."VectraOrderMaterial"("orderId");

-- CreateIndex
CREATE INDEX "VectraOrderSettlementEntry_orderId_idx" ON "vectra"."VectraOrderSettlementEntry"("orderId");

-- CreateIndex
CREATE INDEX "VectraOrderService_orderId_idx" ON "vectra"."VectraOrderService"("orderId");

-- CreateIndex
CREATE INDEX "VectraOrderEquipment_orderId_idx" ON "vectra"."VectraOrderEquipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "VectraOrderEquipment_orderId_warehouseId_key" ON "vectra"."VectraOrderEquipment"("orderId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "VectraWarehouse_serialNumber_key" ON "vectra"."VectraWarehouse"("serialNumber");

-- CreateIndex
CREATE INDEX "VectraWarehouse_itemType_idx" ON "vectra"."VectraWarehouse"("itemType");

-- CreateIndex
CREATE INDEX "VectraWarehouse_locationId_idx" ON "vectra"."VectraWarehouse"("locationId");

-- CreateIndex
CREATE INDEX "VectraWarehouse_assignedToId_idx" ON "vectra"."VectraWarehouse"("assignedToId");

-- CreateIndex
CREATE INDEX "VectraWarehouseHistory_warehouseItemId_idx" ON "vectra"."VectraWarehouseHistory"("warehouseItemId");

-- CreateIndex
CREATE INDEX "VectraWarehouseHistory_action_idx" ON "vectra"."VectraWarehouseHistory"("action");

-- CreateIndex
CREATE INDEX "VectraWarehouseHistory_actionDate_idx" ON "vectra"."VectraWarehouseHistory"("actionDate");

-- CreateIndex
CREATE INDEX "VectraLocationTransfer_fromLocationId_idx" ON "vectra"."VectraLocationTransfer"("fromLocationId");

-- CreateIndex
CREATE INDEX "VectraLocationTransfer_toLocationId_idx" ON "vectra"."VectraLocationTransfer"("toLocationId");

-- CreateIndex
CREATE INDEX "VectraLocationTransfer_status_idx" ON "vectra"."VectraLocationTransfer"("status");

-- CreateIndex
CREATE INDEX "VectraLocationTransferLine_transferId_idx" ON "vectra"."VectraLocationTransferLine"("transferId");

-- CreateIndex
CREATE INDEX "VectraLocationTransferLine_warehouseItemId_idx" ON "vectra"."VectraLocationTransferLine"("warehouseItemId");

-- CreateIndex
CREATE UNIQUE INDEX "VectraMaterialDefinition_name_key" ON "vectra"."VectraMaterialDefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VectraTechnicianMaterialDeficit_technicianId_materialDefini_key" ON "vectra"."VectraTechnicianMaterialDeficit"("technicianId", "materialDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "VectraWarehouseLocation_name_key" ON "vectra"."VectraWarehouseLocation"("name");

-- CreateIndex
CREATE INDEX "_UserLocations_B_index" ON "public"."_UserLocations"("B");

-- AddForeignKey
ALTER TABLE "public"."GlobalUserSettings" ADD CONSTRAINT "GlobalUserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserModule" ADD CONSTRAINT "UserModule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserModule" ADD CONSTRAINT "UserModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraUser" ADD CONSTRAINT "VectraUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraTechnicianSettings" ADD CONSTRAINT "VectraTechnicianSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "vectra"."VectraUser"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrder" ADD CONSTRAINT "VectraOrder_previousOrderId_fkey" FOREIGN KEY ("previousOrderId") REFERENCES "vectra"."VectraOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrder" ADD CONSTRAINT "VectraOrder_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "vectra"."VectraUser"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrder" ADD CONSTRAINT "VectraOrder_transferToId_fkey" FOREIGN KEY ("transferToId") REFERENCES "vectra"."VectraUser"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrderMaterial" ADD CONSTRAINT "VectraOrderMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "vectra"."VectraMaterialDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrderMaterial" ADD CONSTRAINT "VectraOrderMaterial_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "vectra"."VectraOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrderSettlementEntry" ADD CONSTRAINT "VectraOrderSettlementEntry_code_fkey" FOREIGN KEY ("code") REFERENCES "vectra"."VectraRateDefinition"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrderSettlementEntry" ADD CONSTRAINT "VectraOrderSettlementEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "vectra"."VectraOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrderService" ADD CONSTRAINT "VectraOrderService_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "vectra"."VectraOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrderHistory" ADD CONSTRAINT "VectraOrderHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "vectra"."VectraUser"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrderHistory" ADD CONSTRAINT "VectraOrderHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "vectra"."VectraOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrderEquipment" ADD CONSTRAINT "VectraOrderEquipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "vectra"."VectraOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrderEquipment" ADD CONSTRAINT "VectraOrderEquipment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "vectra"."VectraWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraOrderExtraDevice" ADD CONSTRAINT "VectraOrderExtraDevice_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "vectra"."VectraOrderService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraWarehouse" ADD CONSTRAINT "VectraWarehouse_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "vectra"."VectraUser"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraWarehouse" ADD CONSTRAINT "VectraWarehouse_transferToId_fkey" FOREIGN KEY ("transferToId") REFERENCES "vectra"."VectraUser"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraWarehouse" ADD CONSTRAINT "VectraWarehouse_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "vectra"."VectraWarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraWarehouse" ADD CONSTRAINT "VectraWarehouse_materialDefinitionId_fkey" FOREIGN KEY ("materialDefinitionId") REFERENCES "vectra"."VectraMaterialDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" ADD CONSTRAINT "VectraWarehouseHistory_warehouseItemId_fkey" FOREIGN KEY ("warehouseItemId") REFERENCES "vectra"."VectraWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" ADD CONSTRAINT "VectraWarehouseHistory_assignedOrderId_fkey" FOREIGN KEY ("assignedOrderId") REFERENCES "vectra"."VectraOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" ADD CONSTRAINT "VectraWarehouseHistory_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "vectra"."VectraWarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" ADD CONSTRAINT "VectraWarehouseHistory_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "vectra"."VectraWarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" ADD CONSTRAINT "VectraWarehouseHistory_locationTransferId_fkey" FOREIGN KEY ("locationTransferId") REFERENCES "vectra"."VectraLocationTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" ADD CONSTRAINT "VectraWarehouseHistory_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "vectra"."VectraUser"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" ADD CONSTRAINT "VectraWarehouseHistory_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "vectra"."VectraUser"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraLocationTransfer" ADD CONSTRAINT "VectraLocationTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "vectra"."VectraWarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraLocationTransfer" ADD CONSTRAINT "VectraLocationTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "vectra"."VectraWarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraLocationTransfer" ADD CONSTRAINT "VectraLocationTransfer_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "vectra"."VectraUser"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraLocationTransfer" ADD CONSTRAINT "VectraLocationTransfer_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "vectra"."VectraUser"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraLocationTransferLine" ADD CONSTRAINT "VectraLocationTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "vectra"."VectraLocationTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraLocationTransferLine" ADD CONSTRAINT "VectraLocationTransferLine_warehouseItemId_fkey" FOREIGN KEY ("warehouseItemId") REFERENCES "vectra"."VectraWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraLocationTransferLine" ADD CONSTRAINT "VectraLocationTransferLine_materialDefinitionId_fkey" FOREIGN KEY ("materialDefinitionId") REFERENCES "vectra"."VectraMaterialDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraTechnicianMaterialDeficit" ADD CONSTRAINT "VectraTechnicianMaterialDeficit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "vectra"."VectraUser"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vectra"."VectraTechnicianMaterialDeficit" ADD CONSTRAINT "VectraTechnicianMaterialDeficit_materialDefinitionId_fkey" FOREIGN KEY ("materialDefinitionId") REFERENCES "vectra"."VectraMaterialDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_UserLocations" ADD CONSTRAINT "_UserLocations_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_UserLocations" ADD CONSTRAINT "_UserLocations_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."UserLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

