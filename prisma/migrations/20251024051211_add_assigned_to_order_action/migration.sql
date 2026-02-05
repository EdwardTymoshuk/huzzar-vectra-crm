-- CreateEnum
CREATE TYPE "DeviceSource" AS ENUM ('WAREHOUSE', 'CLIENT');

-- AlterEnum
ALTER TYPE "WarehouseAction" ADD VALUE 'ASSIGNED_TO_ORDER';

-- AlterTable
ALTER TABLE "OrderService" ADD COLUMN     "device2Source" "DeviceSource",
ADD COLUMN     "deviceName" TEXT,
ADD COLUMN     "deviceName2" TEXT,
ADD COLUMN     "deviceSource" "DeviceSource",
ADD COLUMN     "extraDevicesCount" INTEGER DEFAULT 0;
