/*
  Warnings:

  - You are about to drop the column `standard` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "standard";

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "materialDefinitionId" TEXT;

-- DropEnum
DROP TYPE "Standard";

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_materialDefinitionId_fkey" FOREIGN KEY ("materialDefinitionId") REFERENCES "MaterialDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
