-- CreateTable
CREATE TABLE "TechnicianSettings" (
    "userId" TEXT NOT NULL,
    "workingDaysGoal" INTEGER NOT NULL,
    "revenueGoal" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianSettings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "TechnicianSettings" ADD CONSTRAINT "TechnicianSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
