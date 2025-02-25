-- AlterEnum
ALTER TYPE "DeviceCategory" ADD VALUE 'ONT';

-- CreateTable
CREATE TABLE "DeviceDefinition" (
    "id" TEXT NOT NULL,
    "category" "DeviceCategory" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DeviceDefinition_pkey" PRIMARY KEY ("id")
);
