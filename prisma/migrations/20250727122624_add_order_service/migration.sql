-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('DTV', 'NET', 'TEL', 'ATV');

-- CreateTable
CREATE TABLE "OrderService" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "deviceId" TEXT,
    "serialNumber" TEXT,
    "deviceId2" TEXT,
    "serialNumber2" TEXT,
    "speedTest" DOUBLE PRECISION,
    "usDbmDown" DOUBLE PRECISION,
    "usDbmUp" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderService_orderId_idx" ON "OrderService"("orderId");

-- AddForeignKey
ALTER TABLE "OrderService" ADD CONSTRAINT "OrderService_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
