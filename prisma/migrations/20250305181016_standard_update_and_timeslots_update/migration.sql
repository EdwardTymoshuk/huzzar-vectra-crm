/*
  Warnings:

  - The values [EIGHT_ELEVEN,ELEVEN_FOURTEEN,FOURTEEN_SEVENTEEN,SEVENTEEN_TWENTY,NINE_ELEVEN,ELEVEN_THIRTEEN,THIRTEEN_FIFTEEN,FIFTEEN_SEVENTEEN,SEVENTEEN_NINETEEN,NINETEEN_TWENTYONE] on the enum `TimeSlot` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TimeSlot_new" AS ENUM ('8-11', '11-14', '14-17', '17-20', '9-11', '11-13', '13-15', '15-17', '17-19', '19-21');
ALTER TABLE "Order" ALTER COLUMN "timeSlot" TYPE "TimeSlot_new" USING ("timeSlot"::text::"TimeSlot_new");
ALTER TYPE "TimeSlot" RENAME TO "TimeSlot_old";
ALTER TYPE "TimeSlot_new" RENAME TO "TimeSlot";
DROP TYPE "TimeSlot_old";
COMMIT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "standard" DROP NOT NULL;
