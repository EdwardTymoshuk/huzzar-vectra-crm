CREATE TABLE IF NOT EXISTS "opl"."OplZoneDefinition" (
  "zone" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "OplZoneDefinition_pkey" PRIMARY KEY ("zone")
);

CREATE INDEX IF NOT EXISTS "OplZoneDefinition_active_sortOrder_idx"
ON "opl"."OplZoneDefinition"("active", "sortOrder");

INSERT INTO "opl"."OplZoneDefinition" ("zone", "active", "sortOrder")
VALUES
  ('GDAŃSK FTTH', true, 10),
  ('GDYNIA FTTH', true, 20)
ON CONFLICT ("zone") DO NOTHING;
