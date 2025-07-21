/*
  Warnings:

  - Added the required column `operator` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Operator" AS ENUM ('V', 'MMP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "operator" "Operator" NOT NULL;
