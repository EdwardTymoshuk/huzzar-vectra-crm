/*
  Warnings:

  - You are about to drop the column `contractRequired` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `equipmentNeeded` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "contractRequired",
DROP COLUMN "equipmentNeeded";
