-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "transferPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transferToId" TEXT;
