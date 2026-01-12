-- CreateTable
CREATE TABLE "OrderExtraDevice" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "source" "DeviceSource" NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT,
    "category" "DeviceCategory",

    CONSTRAINT "OrderExtraDevice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderExtraDevice" ADD CONSTRAINT "OrderExtraDevice_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "OrderService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
