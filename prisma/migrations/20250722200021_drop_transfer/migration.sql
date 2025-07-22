/*
  Warnings:

  - The values [TRANSFER] on the enum `WarehouseAction` will be removed. If these variants are still used in the database, this will fail.
  - The values [TRANSFER] on the enum `WarehouseStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WarehouseAction_new" AS ENUM ('RECEIVED', 'ISSUED', 'RETURNED', 'RETURNED_TO_OPERATOR');
ALTER TABLE "WarehouseHistory" ALTER COLUMN "action" TYPE "WarehouseAction_new" USING ("action"::text::"WarehouseAction_new");
ALTER TYPE "WarehouseAction" RENAME TO "WarehouseAction_old";
ALTER TYPE "WarehouseAction_new" RENAME TO "WarehouseAction";
DROP TYPE "WarehouseAction_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WarehouseStatus_new" AS ENUM ('AVAILABLE', 'ASSIGNED', 'RETURNED', 'ASSIGNED_TO_ORDER', 'RETURNED_TO_OPERATOR');
ALTER TABLE "Warehouse" ALTER COLUMN "status" TYPE "WarehouseStatus_new" USING ("status"::text::"WarehouseStatus_new");
ALTER TYPE "WarehouseStatus" RENAME TO "WarehouseStatus_old";
ALTER TYPE "WarehouseStatus_new" RENAME TO "WarehouseStatus";
DROP TYPE "WarehouseStatus_old";
COMMIT;
