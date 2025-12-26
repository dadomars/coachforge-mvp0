-- CreateTable
CREATE TABLE "session_block" (
  "block_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL,
  CONSTRAINT "session_block_pkey" PRIMARY KEY ("block_id")
);

-- CreateTable
CREATE TABLE "session_row" (
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
  CONSTRAINT "session_row_pkey" PRIMARY KEY ("row_id")
);

-- CreateIndex
CREATE INDEX "idx_session_block_session_id" ON "session_block"("session_id");
CREATE INDEX "idx_session_block_sort_order" ON "session_block"("sort_order");

-- CreateIndex
CREATE INDEX "idx_session_row_block_id" ON "session_row"("block_id");
CREATE INDEX "idx_session_row_exercise_id" ON "session_row"("exercise_id");
CREATE INDEX "idx_session_row_sort_order" ON "session_row"("sort_order");

-- AddForeignKey
ALTER TABLE "session_block"
ADD CONSTRAINT "session_block_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "session"("session_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_row"
ADD CONSTRAINT "session_row_block_id_fkey"
FOREIGN KEY ("block_id") REFERENCES "session_block"("block_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_row"
ADD CONSTRAINT "session_row_exercise_id_fkey"
FOREIGN KEY ("exercise_id") REFERENCES "exercise"("exercise_id")
ON DELETE CASCADE ON UPDATE CASCADE;