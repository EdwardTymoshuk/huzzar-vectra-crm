/*
  Warnings:

  - Made the column `unit` on table `Warehouse` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MaterialDefinition" ADD COLUMN     "unit" "MaterialUnit" NOT NULL DEFAULT 'PIECE';

-- AlterTable
ALTER TABLE "Warehouse" ALTER COLUMN "unit" SET NOT NULL;
