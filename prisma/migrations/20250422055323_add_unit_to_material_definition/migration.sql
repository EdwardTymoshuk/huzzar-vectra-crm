/*
  Warnings:

  - A unique constraint covering the columns `[index]` on the table `Warehouse` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Warehouse" ALTER COLUMN "unit" SET DEFAULT 'PIECE';

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_index_key" ON "Warehouse"("index");
