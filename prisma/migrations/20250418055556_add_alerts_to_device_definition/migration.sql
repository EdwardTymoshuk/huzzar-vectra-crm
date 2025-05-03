-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "alarmAlert" INTEGER DEFAULT 5,
ADD COLUMN     "index" TEXT,
ADD COLUMN     "warningAlert" INTEGER DEFAULT 10;
