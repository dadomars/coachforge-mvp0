-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PLANNED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "competition" (
    "competition_id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date_start" TIMESTAMP(3) NOT NULL,
    "date_end" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL,
    "is_target" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "competition_pkey" PRIMARY KEY ("competition_id")
);

-- CreateTable
CREATE TABLE "event" (
    "event_id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date_start" TIMESTAMP(3) NOT NULL,
    "date_end" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL,
    "type_label" TEXT NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "idx_competition_athlete_id" ON "competition"("athlete_id");

-- CreateIndex
CREATE INDEX "idx_event_athlete_id" ON "event"("athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "competition_target_per_athlete" ON "competition"("athlete_id") WHERE "is_target" = true;

-- AddForeignKey
ALTER TABLE "competition" ADD CONSTRAINT "competition_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("athlete_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("athlete_id") ON DELETE CASCADE ON UPDATE CASCADE;
