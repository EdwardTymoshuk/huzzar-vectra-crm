-- AlterTable
ALTER TABLE "DeviceDefinition" ADD COLUMN     "alarmAlert" INTEGER DEFAULT 5,
ADD COLUMN     "warningAlert" INTEGER DEFAULT 10;

-- AlterTable
ALTER TABLE "MaterialDefinition" ADD COLUMN     "alarmAlert" INTEGER DEFAULT 5,
ADD COLUMN     "index" TEXT,
ADD COLUMN     "warningAlert" INTEGER DEFAULT 10;
