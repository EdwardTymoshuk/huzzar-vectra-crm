ALTER TABLE "opl"."OplOrder"
ADD COLUMN IF NOT EXISTS "leads" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "termChangeFlag" SET DEFAULT 'N';

UPDATE "opl"."OplOrder"
SET "termChangeFlag" = 'N'
WHERE "termChangeFlag" IS NULL OR BTRIM("termChangeFlag") = '';

ALTER TABLE "opl"."OplOrder"
ALTER COLUMN "termChangeFlag" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "opl"."OplNpsEntry" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "technicianName" TEXT,
  "zone" TEXT,
  "operator" TEXT,
  "q6Score" INTEGER NOT NULL,
  "orderId" TEXT,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "importedById" TEXT,
  CONSTRAINT "OplNpsEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OplNpsEntry_orderNumber_key"
ON "opl"."OplNpsEntry"("orderNumber");

CREATE INDEX IF NOT EXISTS "OplNpsEntry_zone_idx"
ON "opl"."OplNpsEntry"("zone");

CREATE INDEX IF NOT EXISTS "OplNpsEntry_technicianName_idx"
ON "opl"."OplNpsEntry"("technicianName");

CREATE INDEX IF NOT EXISTS "OplNpsEntry_operator_idx"
ON "opl"."OplNpsEntry"("operator");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'OplNpsEntry_orderId_fkey'
  ) THEN
    ALTER TABLE "opl"."OplNpsEntry"
    ADD CONSTRAINT "OplNpsEntry_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "opl"."OplOrder"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'OplNpsEntry_importedById_fkey'
  ) THEN
    ALTER TABLE "opl"."OplNpsEntry"
    ADD CONSTRAINT "OplNpsEntry_importedById_fkey"
      FOREIGN KEY ("importedById") REFERENCES "opl"."OplUser"("userId")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
