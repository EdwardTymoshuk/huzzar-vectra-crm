/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `RateDefinition` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "failureReason" TEXT;

-- CreateTable
CREATE TABLE "OrderMaterial" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" "MaterialUnit" NOT NULL,

    CONSTRAINT "OrderMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderMaterial_orderId_idx" ON "OrderMaterial"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "RateDefinition_code_key" ON "RateDefinition"("code");

-- AddForeignKey
ALTER TABLE "OrderMaterial" ADD CONSTRAINT "OrderMaterial_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderMaterial" ADD CONSTRAINT "OrderMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSettlementEntry" ADD CONSTRAINT "OrderSettlementEntry_code_fkey" FOREIGN KEY ("code") REFERENCES "RateDefinition"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
