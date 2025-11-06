/*
  Warnings:

  - A unique constraint covering the columns `[orderNumber,city,street,attemptNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Order_orderNumber_date_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "attemptNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "previousOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_city_street_attemptNumber_key" ON "Order"("orderNumber", "city", "street", "attemptNumber");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_previousOrderId_fkey" FOREIGN KEY ("previousOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
