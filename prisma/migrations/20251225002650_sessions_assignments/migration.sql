-- CreateTable
CREATE TABLE "session" (
    "session_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "session_date" TIMESTAMP(3),
    "notes_public" TEXT NOT NULL DEFAULT '',
    "notes_private" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "session_assignment" (
    "assignment_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_assignment_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateIndex
CREATE INDEX "idx_session_coach_id" ON "session"("coach_id");

-- CreateIndex
CREATE INDEX "idx_session_assignment_session_id" ON "session_assignment"("session_id");

-- CreateIndex
CREATE INDEX "idx_session_assignment_athlete_id" ON "session_assignment"("athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_session_assignment_session_athlete" ON "session_assignment"("session_id", "athlete_id");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coach"("coach_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_assignment" ADD CONSTRAINT "session_assignment_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_assignment" ADD CONSTRAINT "session_assignment_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("athlete_id") ON DELETE CASCADE ON UPDATE CASCADE;
