/*
  Warnings:

  - A unique constraint covering the columns `[orderNumber,date]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Order_orderNumber_key";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "equipmentNeeded" SET DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_date_key" ON "Order"("orderNumber", "date");
