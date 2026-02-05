-- DropForeignKey
ALTER TABLE "opl"."OplLocationTransfer" DROP CONSTRAINT "OplLocationTransfer_confirmedById_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplLocationTransfer" DROP CONSTRAINT "OplLocationTransfer_fromLocationId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplLocationTransfer" DROP CONSTRAINT "OplLocationTransfer_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplLocationTransfer" DROP CONSTRAINT "OplLocationTransfer_toLocationId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplLocationTransferLine" DROP CONSTRAINT "OplLocationTransferLine_materialDefinitionId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplLocationTransferLine" DROP CONSTRAINT "OplLocationTransferLine_transferId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplLocationTransferLine" DROP CONSTRAINT "OplLocationTransferLine_warehouseItemId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrder" DROP CONSTRAINT "OplOrder_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrder" DROP CONSTRAINT "OplOrder_previousOrderId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrder" DROP CONSTRAINT "OplOrder_transferToId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrderEquipment" DROP CONSTRAINT "OplOrderEquipment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrderEquipment" DROP CONSTRAINT "OplOrderEquipment_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrderExtraDevice" DROP CONSTRAINT "OplOrderExtraDevice_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrderHistory" DROP CONSTRAINT "OplOrderHistory_changedById_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrderHistory" DROP CONSTRAINT "OplOrderHistory_orderId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrderMaterial" DROP CONSTRAINT "OplOrderMaterial_materialId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrderMaterial" DROP CONSTRAINT "OplOrderMaterial_orderId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrderService" DROP CONSTRAINT "OplOrderService_orderId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrderSettlementEntry" DROP CONSTRAINT "OplOrderSettlementEntry_code_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplOrderSettlementEntry" DROP CONSTRAINT "OplOrderSettlementEntry_orderId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplTechnicianMaterialDeficit" DROP CONSTRAINT "OplTechnicianMaterialDeficit_materialDefinitionId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplTechnicianMaterialDeficit" DROP CONSTRAINT "OplTechnicianMaterialDeficit_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplUser" DROP CONSTRAINT "OplUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplWarehouse" DROP CONSTRAINT "OplWarehouse_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplWarehouse" DROP CONSTRAINT "OplWarehouse_locationId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplWarehouse" DROP CONSTRAINT "OplWarehouse_materialDefinitionId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplWarehouse" DROP CONSTRAINT "OplWarehouse_transferToId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplWarehouseHistory" DROP CONSTRAINT "OplWarehouseHistory_assignedOrderId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplWarehouseHistory" DROP CONSTRAINT "OplWarehouseHistory_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplWarehouseHistory" DROP CONSTRAINT "OplWarehouseHistory_fromLocationId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplWarehouseHistory" DROP CONSTRAINT "OplWarehouseHistory_locationTransferId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplWarehouseHistory" DROP CONSTRAINT "OplWarehouseHistory_performedById_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplWarehouseHistory" DROP CONSTRAINT "OplWarehouseHistory_toLocationId_fkey";

-- DropForeignKey
ALTER TABLE "opl"."OplWarehouseHistory" DROP CONSTRAINT "OplWarehouseHistory_warehouseItemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GlobalUserSettings" DROP CONSTRAINT "GlobalUserSettings_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserLocation" DROP CONSTRAINT "UserLocation_locationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserLocation" DROP CONSTRAINT "UserLocation_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserModule" DROP CONSTRAINT "UserModule_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserModule" DROP CONSTRAINT "UserModule_userId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraLocationTransfer" DROP CONSTRAINT "VectraLocationTransfer_confirmedById_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraLocationTransfer" DROP CONSTRAINT "VectraLocationTransfer_fromLocationId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraLocationTransfer" DROP CONSTRAINT "VectraLocationTransfer_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraLocationTransfer" DROP CONSTRAINT "VectraLocationTransfer_toLocationId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraLocationTransferLine" DROP CONSTRAINT "VectraLocationTransferLine_materialDefinitionId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraLocationTransferLine" DROP CONSTRAINT "VectraLocationTransferLine_transferId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraLocationTransferLine" DROP CONSTRAINT "VectraLocationTransferLine_warehouseItemId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrder" DROP CONSTRAINT "VectraOrder_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrder" DROP CONSTRAINT "VectraOrder_previousOrderId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrder" DROP CONSTRAINT "VectraOrder_transferToId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrderEquipment" DROP CONSTRAINT "VectraOrderEquipment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrderEquipment" DROP CONSTRAINT "VectraOrderEquipment_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrderExtraDevice" DROP CONSTRAINT "VectraOrderExtraDevice_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrderHistory" DROP CONSTRAINT "VectraOrderHistory_changedById_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrderHistory" DROP CONSTRAINT "VectraOrderHistory_orderId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrderMaterial" DROP CONSTRAINT "VectraOrderMaterial_materialId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrderMaterial" DROP CONSTRAINT "VectraOrderMaterial_orderId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrderService" DROP CONSTRAINT "VectraOrderService_orderId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrderSettlementEntry" DROP CONSTRAINT "VectraOrderSettlementEntry_code_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraOrderSettlementEntry" DROP CONSTRAINT "VectraOrderSettlementEntry_orderId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraTechnicianMaterialDeficit" DROP CONSTRAINT "VectraTechnicianMaterialDeficit_materialDefinitionId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraTechnicianMaterialDeficit" DROP CONSTRAINT "VectraTechnicianMaterialDeficit_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraTechnicianSettings" DROP CONSTRAINT "VectraTechnicianSettings_userId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraUser" DROP CONSTRAINT "VectraUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraWarehouse" DROP CONSTRAINT "VectraWarehouse_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraWarehouse" DROP CONSTRAINT "VectraWarehouse_locationId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraWarehouse" DROP CONSTRAINT "VectraWarehouse_materialDefinitionId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraWarehouse" DROP CONSTRAINT "VectraWarehouse_transferToId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" DROP CONSTRAINT "VectraWarehouseHistory_assignedOrderId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" DROP CONSTRAINT "VectraWarehouseHistory_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" DROP CONSTRAINT "VectraWarehouseHistory_fromLocationId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" DROP CONSTRAINT "VectraWarehouseHistory_locationTransferId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" DROP CONSTRAINT "VectraWarehouseHistory_performedById_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" DROP CONSTRAINT "VectraWarehouseHistory_toLocationId_fkey";

-- DropForeignKey
ALTER TABLE "vectra"."VectraWarehouseHistory" DROP CONSTRAINT "VectraWarehouseHistory_warehouseItemId_fkey";

-- DropTable
DROP TABLE "opl"."OplDeviceDefinition";

-- DropTable
DROP TABLE "opl"."OplLocationTransfer";

-- DropTable
DROP TABLE "opl"."OplLocationTransferLine";

-- DropTable
DROP TABLE "opl"."OplMaterialDefinition";

-- DropTable
DROP TABLE "opl"."OplOperatorDefinition";

-- DropTable
DROP TABLE "opl"."OplOrder";

-- DropTable
DROP TABLE "opl"."OplOrderEquipment";

-- DropTable
DROP TABLE "opl"."OplOrderExtraDevice";

-- DropTable
DROP TABLE "opl"."OplOrderHistory";

-- DropTable
DROP TABLE "opl"."OplOrderMaterial";

-- DropTable
DROP TABLE "opl"."OplOrderService";

-- DropTable
DROP TABLE "opl"."OplOrderSettlementEntry";

-- DropTable
DROP TABLE "opl"."OplRateDefinition";

-- DropTable
DROP TABLE "opl"."OplTechnicianMaterialDeficit";

-- DropTable
DROP TABLE "opl"."OplUser";

-- DropTable
DROP TABLE "opl"."OplWarehouse";

-- DropTable
DROP TABLE "opl"."OplWarehouseHistory";

-- DropTable
DROP TABLE "public"."GlobalUserSettings";

-- DropTable
DROP TABLE "public"."Location";

-- DropTable
DROP TABLE "public"."Module";

-- DropTable
DROP TABLE "public"."User";

-- DropTable
DROP TABLE "public"."UserLocation";

-- DropTable
DROP TABLE "public"."UserModule";

-- DropTable
DROP TABLE "vectra"."VectraDeviceDefinition";

-- DropTable
DROP TABLE "vectra"."VectraLocationTransfer";

-- DropTable
DROP TABLE "vectra"."VectraLocationTransferLine";

-- DropTable
DROP TABLE "vectra"."VectraMaterialDefinition";

-- DropTable
DROP TABLE "vectra"."VectraOperatorDefinition";

-- DropTable
DROP TABLE "vectra"."VectraOrder";

-- DropTable
DROP TABLE "vectra"."VectraOrderEquipment";

-- DropTable
DROP TABLE "vectra"."VectraOrderExtraDevice";

-- DropTable
DROP TABLE "vectra"."VectraOrderHistory";

-- DropTable
DROP TABLE "vectra"."VectraOrderMaterial";

-- DropTable
DROP TABLE "vectra"."VectraOrderService";

-- DropTable
DROP TABLE "vectra"."VectraOrderSettlementEntry";

-- DropTable
DROP TABLE "vectra"."VectraRateDefinition";

-- DropTable
DROP TABLE "vectra"."VectraTechnicianMaterialDeficit";

-- DropTable
DROP TABLE "vectra"."VectraTechnicianSettings";

-- DropTable
DROP TABLE "vectra"."VectraUser";

-- DropTable
DROP TABLE "vectra"."VectraWarehouse";

-- DropTable
DROP TABLE "vectra"."VectraWarehouseHistory";

-- DropTable
DROP TABLE "vectra"."VectraWarehouseLocation";

-- DropEnum
DROP TYPE "opl"."OplDeviceCategory";

-- DropEnum
DROP TYPE "opl"."OplDeviceSource";

-- DropEnum
DROP TYPE "opl"."OplInstallationType";

-- DropEnum
DROP TYPE "opl"."OplLocationTransferStatus";

-- DropEnum
DROP TYPE "opl"."OplMaterialUnit";

-- DropEnum
DROP TYPE "opl"."OplOrderCreatedSource";

-- DropEnum
DROP TYPE "opl"."OplOrderStandard";

-- DropEnum
DROP TYPE "opl"."OplOrderStatus";

-- DropEnum
DROP TYPE "opl"."OplOrderType";

-- DropEnum
DROP TYPE "opl"."OplServisType";

-- DropEnum
DROP TYPE "opl"."OplTimeSlot";

-- DropEnum
DROP TYPE "opl"."OplWarehouseAction";

-- DropEnum
DROP TYPE "opl"."OplWarehouseItemType";

-- DropEnum
DROP TYPE "opl"."OplWarehouseStatus";

-- DropEnum
DROP TYPE "public"."Role";

-- DropEnum
DROP TYPE "public"."UserStatus";

-- DropEnum
DROP TYPE "vectra"."VectraDeviceCategory";

-- DropEnum
DROP TYPE "vectra"."VectraDeviceSource";

-- DropEnum
DROP TYPE "vectra"."VectraLocationTransferStatus";

-- DropEnum
DROP TYPE "vectra"."VectraMaterialUnit";

-- DropEnum
DROP TYPE "vectra"."VectraOrderCreatedSource";

-- DropEnum
DROP TYPE "vectra"."VectraOrderStatus";

-- DropEnum
DROP TYPE "vectra"."VectraOrderType";

-- DropEnum
DROP TYPE "vectra"."VectraServiceType";

-- DropEnum
DROP TYPE "vectra"."VectraTimeSlot";

-- DropEnum
DROP TYPE "vectra"."VectraWarehouseAction";

-- DropEnum
DROP TYPE "vectra"."VectraWarehouseItemType";

-- DropEnum
DROP TYPE "vectra"."VectraWarehouseStatus";

