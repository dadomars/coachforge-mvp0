-- AlterTable
ALTER TABLE "competition" ADD COLUMN IF NOT EXISTS "coach_id" TEXT;
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "coach_id" TEXT;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "competition" ADD CONSTRAINT "competition_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coach"("coach_id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "event" ADD CONSTRAINT "event_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coach"("coach_id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "competition_assignment" (
    "assignment_id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "is_target" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_assignment_pkey" PRIMARY KEY ("assignment_id"),
    CONSTRAINT "competition_assignment_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("athlete_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "competition_assignment_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competition"("competition_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "event_assignment" (
    "assignment_id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_assignment_pkey" PRIMARY KEY ("assignment_id"),
    CONSTRAINT "event_assignment_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("athlete_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_assignment_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("event_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_competition_assignment_athlete_competition" ON "competition_assignment"("athlete_id", "competition_id");
CREATE INDEX IF NOT EXISTS "idx_competition_assignment_athlete_id" ON "competition_assignment"("athlete_id");
CREATE INDEX IF NOT EXISTS "idx_competition_assignment_competition_id" ON "competition_assignment"("competition_id");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_event_assignment_athlete_event" ON "event_assignment"("athlete_id", "event_id");
CREATE INDEX IF NOT EXISTS "idx_event_assignment_athlete_id" ON "event_assignment"("athlete_id");
CREATE INDEX IF NOT EXISTS "idx_event_assignment_event_id" ON "event_assignment"("event_id");

-- Backfill coach ownership from athletes
UPDATE "competition" c
SET "coach_id" = a."coach_id"
FROM "athlete" a
WHERE c."athlete_id" = a."athlete_id"
  AND c."coach_id" IS NULL;

UPDATE "event" e
SET "coach_id" = a."coach_id"
FROM "athlete" a
WHERE e."athlete_id" = a."athlete_id"
  AND e."coach_id" IS NULL;

-- Backfill assignments from per-athlete rows
INSERT INTO "competition_assignment" ("assignment_id", "athlete_id", "competition_id", "is_target", "assigned_at")
SELECT md5(random()::text || clock_timestamp()::text), c."athlete_id", c."competition_id", c."is_target", CURRENT_TIMESTAMP
FROM "competition" c
WHERE c."athlete_id" IS NOT NULL
ON CONFLICT ("athlete_id", "competition_id") DO NOTHING;

INSERT INTO "event_assignment" ("assignment_id", "athlete_id", "event_id", "assigned_at")
SELECT md5(random()::text || clock_timestamp()::text), e."athlete_id", e."event_id", CURRENT_TIMESTAMP
FROM "event" e
WHERE e."athlete_id" IS NOT NULL
ON CONFLICT ("athlete_id", "event_id") DO NOTHING;
