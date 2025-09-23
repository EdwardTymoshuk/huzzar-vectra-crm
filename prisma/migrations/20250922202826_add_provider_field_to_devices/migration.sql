/*
  Warnings:

  - The `subcategory` column on the `Warehouse` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DeviceProvider" AS ENUM ('VECTRA', 'MMP');

-- AlterTable
ALTER TABLE "Warehouse" DROP COLUMN "subcategory",
ADD COLUMN     "subcategory" "DeviceProvider";
