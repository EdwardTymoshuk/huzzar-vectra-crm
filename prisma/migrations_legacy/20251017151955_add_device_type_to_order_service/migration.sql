/*
  Warnings:

  - You are about to drop the column `provider` on the `DeviceDefinition` table. All the data in the column will be lost.
  - You are about to drop the column `subcategory` on the `Warehouse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DeviceDefinition" DROP COLUMN "provider";

-- AlterTable
ALTER TABLE "OrderService" ADD COLUMN     "deviceType" "DeviceCategory",
ADD COLUMN     "deviceType2" "DeviceCategory";

-- AlterTable
ALTER TABLE "Warehouse" DROP COLUMN "subcategory";

-- DropEnum
DROP TYPE "DeviceProvider";
