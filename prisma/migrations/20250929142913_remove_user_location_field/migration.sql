/*
  Warnings:

  - You are about to drop the column `locationId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_locationId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "locationId";

-- CreateTable
CREATE TABLE "_UserLocations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserLocations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserLocations_B_index" ON "_UserLocations"("B");

-- AddForeignKey
ALTER TABLE "_UserLocations" ADD CONSTRAINT "_UserLocations_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserLocations" ADD CONSTRAINT "_UserLocations_B_fkey" FOREIGN KEY ("B") REFERENCES "WarehouseLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
