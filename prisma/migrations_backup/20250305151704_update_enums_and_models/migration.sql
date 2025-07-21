-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TimeSlot" ADD VALUE 'NINE_ELEVEN';
ALTER TYPE "TimeSlot" ADD VALUE 'ELEVEN_THIRTEEN';
ALTER TYPE "TimeSlot" ADD VALUE 'THIRTEEN_FIFTEEN';
ALTER TYPE "TimeSlot" ADD VALUE 'FIFTEEN_SEVENTEEN';
ALTER TYPE "TimeSlot" ADD VALUE 'SEVENTEEN_NINETEEN';
ALTER TYPE "TimeSlot" ADD VALUE 'NINETEEN_TWENTYONE';
