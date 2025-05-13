-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TimeSlot" ADD VALUE '8-9';
ALTER TYPE "TimeSlot" ADD VALUE '9-10';
ALTER TYPE "TimeSlot" ADD VALUE '10-11';
ALTER TYPE "TimeSlot" ADD VALUE '11-12';
ALTER TYPE "TimeSlot" ADD VALUE '12-13';
ALTER TYPE "TimeSlot" ADD VALUE '13-14';
ALTER TYPE "TimeSlot" ADD VALUE '14-15';
ALTER TYPE "TimeSlot" ADD VALUE '15-16';
ALTER TYPE "TimeSlot" ADD VALUE '16-17';
ALTER TYPE "TimeSlot" ADD VALUE '17-18';
ALTER TYPE "TimeSlot" ADD VALUE '18-19';
ALTER TYPE "TimeSlot" ADD VALUE '19-20';
ALTER TYPE "TimeSlot" ADD VALUE '20-21';
