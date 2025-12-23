-- CreateTable
CREATE TABLE "session_template" (
    "session_template_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes_public" TEXT NOT NULL DEFAULT '',
    "notes_private" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_template_pkey" PRIMARY KEY ("session_template_id")
);

-- CreateTable
CREATE TABLE "session_template_block" (
    "block_id" TEXT NOT NULL,
    "session_template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "session_template_block_pkey" PRIMARY KEY ("block_id")
);

-- CreateTable
CREATE TABLE "session_template_row" (
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

    CONSTRAINT "session_template_row_pkey" PRIMARY KEY ("row_id")
);

-- CreateIndex
CREATE INDEX "idx_session_template_coach_id" ON "session_template"("coach_id");

-- CreateIndex
CREATE INDEX "idx_session_template_block_template_id" ON "session_template_block"("session_template_id");

-- CreateIndex
CREATE INDEX "idx_session_template_block_sort_order" ON "session_template_block"("sort_order");

-- CreateIndex
CREATE INDEX "idx_session_template_row_block_id" ON "session_template_row"("block_id");

-- CreateIndex
CREATE INDEX "idx_session_template_row_exercise_id" ON "session_template_row"("exercise_id");

-- CreateIndex
CREATE INDEX "idx_session_template_row_sort_order" ON "session_template_row"("sort_order");

-- AddForeignKey
ALTER TABLE "session_template" ADD CONSTRAINT "session_template_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coach"("coach_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_template_block" ADD CONSTRAINT "session_template_block_session_template_id_fkey" FOREIGN KEY ("session_template_id") REFERENCES "session_template"("session_template_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_template_row" ADD CONSTRAINT "session_template_row_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "session_template_block"("block_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_template_row" ADD CONSTRAINT "session_template_row_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("exercise_id") ON DELETE CASCADE ON UPDATE CASCADE;
