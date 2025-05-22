-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'USER';

-- CreateTable
CREATE TABLE "OrderSettlementEntry" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OrderSettlementEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderSettlementEntry_orderId_idx" ON "OrderSettlementEntry"("orderId");

-- AddForeignKey
ALTER TABLE "OrderSettlementEntry" ADD CONSTRAINT "OrderSettlementEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
