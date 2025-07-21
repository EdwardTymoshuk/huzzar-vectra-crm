-- CreateTable
CREATE TABLE "RateDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RateDefinition_pkey" PRIMARY KEY ("id")
);
