CREATE TABLE IF NOT EXISTS "opl"."OplLeadEntry" (
  "id" TEXT NOT NULL,
  "zone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "leadNumber" TEXT NOT NULL,
  "operator" TEXT NOT NULL DEFAULT 'ORANGE',
  "technicianId" TEXT,
  "technicianName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  CONSTRAINT "OplLeadEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OplLeadEntry_zone_idx" ON "opl"."OplLeadEntry"("zone");
CREATE INDEX IF NOT EXISTS "OplLeadEntry_operator_idx" ON "opl"."OplLeadEntry"("operator");
CREATE INDEX IF NOT EXISTS "OplLeadEntry_createdAt_idx" ON "opl"."OplLeadEntry"("createdAt");
CREATE INDEX IF NOT EXISTS "OplLeadEntry_leadNumber_idx" ON "opl"."OplLeadEntry"("leadNumber");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'OplLeadEntry_technicianId_fkey'
  ) THEN
    ALTER TABLE "opl"."OplLeadEntry"
    ADD CONSTRAINT "OplLeadEntry_technicianId_fkey"
      FOREIGN KEY ("technicianId") REFERENCES "opl"."OplUser"("userId")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'OplLeadEntry_createdById_fkey'
  ) THEN
    ALTER TABLE "opl"."OplLeadEntry"
    ADD CONSTRAINT "OplLeadEntry_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "opl"."OplUser"("userId")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
