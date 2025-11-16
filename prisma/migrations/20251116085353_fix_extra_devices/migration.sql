/*
  Warnings:

  - You are about to drop the column `warehouseId` on the `OrderExtraDevice` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrderExtraDevice" DROP CONSTRAINT "OrderExtraDevice_warehouseId_fkey";

-- AlterTable
ALTER TABLE "OrderExtraDevice" DROP COLUMN "warehouseId";
