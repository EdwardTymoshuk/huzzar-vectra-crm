DO $$ BEGIN
  CREATE TYPE "opl"."OplTechnicianAbsenceType" AS ENUM ('VACATION', 'DAY_OFF', 'SICK_LEAVE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "opl"."OplTechnicianAbsence" (
  "id" TEXT NOT NULL,
  "technicianId" TEXT NOT NULL,
  "dateFrom" TIMESTAMP(3) NOT NULL,
  "dateTo" TIMESTAMP(3) NOT NULL,
  "type" "opl"."OplTechnicianAbsenceType" NOT NULL DEFAULT 'OTHER',
  "reason" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  CONSTRAINT "OplTechnicianAbsence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OplTechnicianAbsence_technicianId_active_idx"
  ON "opl"."OplTechnicianAbsence"("technicianId", "active");
CREATE INDEX IF NOT EXISTS "OplTechnicianAbsence_dateFrom_dateTo_active_idx"
  ON "opl"."OplTechnicianAbsence"("dateFrom", "dateTo", "active");

DO $$ BEGIN
  ALTER TABLE "opl"."OplTechnicianAbsence"
    ADD CONSTRAINT "OplTechnicianAbsence_technicianId_fkey"
    FOREIGN KEY ("technicianId") REFERENCES "opl"."OplUser"("userId")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "opl"."OplTechnicianAbsence"
    ADD CONSTRAINT "OplTechnicianAbsence_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "opl"."OplUser"("userId")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
