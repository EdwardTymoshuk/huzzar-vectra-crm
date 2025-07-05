-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "transferPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transferToId" TEXT;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_transferToId_fkey" FOREIGN KEY ("transferToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
