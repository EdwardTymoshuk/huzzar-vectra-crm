/*
  Warnings:

  - The values [UA] on the enum `WarehouseItemType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "DeviceCategory" ADD VALUE 'UA';

-- AlterEnum
BEGIN;
CREATE TYPE "WarehouseItemType_new" AS ENUM ('DEVICE', 'MATERIAL');
ALTER TABLE "Warehouse" ALTER COLUMN "itemType" TYPE "WarehouseItemType_new" USING ("itemType"::text::"WarehouseItemType_new");
ALTER TYPE "WarehouseItemType" RENAME TO "WarehouseItemType_old";
ALTER TYPE "WarehouseItemType_new" RENAME TO "WarehouseItemType";
DROP TYPE "WarehouseItemType_old";
COMMIT;
