/*
  Warnings:

  - Changed the type of `operator` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Order"
ALTER COLUMN "operator" TYPE TEXT
USING "operator"::TEXT;

-- DropEnum
DROP TYPE "Operator";

-- CreateTable
CREATE TABLE "OperatorDefinition" (
    "operator" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatorDefinition_operator_key" ON "OperatorDefinition"("operator");
