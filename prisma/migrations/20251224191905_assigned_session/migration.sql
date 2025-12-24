-- CreateTable
CREATE TABLE "assigned_session" (
    "assigned_session_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "template_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "notes_public" TEXT NOT NULL DEFAULT '',
    "notes_private" TEXT NOT NULL DEFAULT '',
    "status" "EventStatus" NOT NULL DEFAULT 'PLANNED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assigned_session_pkey" PRIMARY KEY ("assigned_session_id")
);

-- CreateTable
CREATE TABLE "assigned_session_block" (
    "block_id" TEXT NOT NULL,
    "assigned_session_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "assigned_session_block_pkey" PRIMARY KEY ("block_id")
);

-- CreateTable
CREATE TABLE "assigned_session_row" (
    "row_id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "sets" TEXT,
    "reps" TEXT,
    "rest" TEXT,
    "percent" DOUBLE PRECISION,
    "kg" DOUBLE PRECISION,
    "notes_public" TEXT,
    "notes_private" TEXT,

    CONSTRAINT "assigned_session_row_pkey" PRIMARY KEY ("row_id")
);

-- CreateIndex
CREATE INDEX "idx_assigned_session_athlete_date" ON "assigned_session"("athlete_id", "date");

-- CreateIndex
CREATE INDEX "idx_assigned_session_coach_id" ON "assigned_session"("coach_id");

-- AddForeignKey
ALTER TABLE "assigned_session" ADD CONSTRAINT "assigned_session_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coach"("coach_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assigned_session" ADD CONSTRAINT "assigned_session_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("athlete_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assigned_session" ADD CONSTRAINT "assigned_session_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "session_template"("session_template_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assigned_session_block" ADD CONSTRAINT "assigned_session_block_assigned_session_id_fkey" FOREIGN KEY ("assigned_session_id") REFERENCES "assigned_session"("assigned_session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assigned_session_row" ADD CONSTRAINT "assigned_session_row_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "assigned_session_block"("block_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assigned_session_row" ADD CONSTRAINT "assigned_session_row_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("exercise_id") ON DELETE CASCADE ON UPDATE CASCADE;
