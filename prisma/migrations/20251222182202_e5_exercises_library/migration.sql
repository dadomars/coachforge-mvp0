-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('WEIGHTLIFTING', 'GYM', 'METCON', 'RUN', 'ERG', 'ALTRO');

-- CreateTable
CREATE TABLE "exercise" (
    "exercise_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ExerciseCategory" NOT NULL DEFAULT 'ALTRO',
    "notes_public" TEXT NOT NULL DEFAULT '',
    "notes_private" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_pkey" PRIMARY KEY ("exercise_id")
);

-- CreateIndex
CREATE INDEX "idx_exercise_coach_id" ON "exercise"("coach_id");

-- CreateIndex
CREATE INDEX "idx_exercise_name" ON "exercise"("name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_exercise_coach_name" ON "exercise"("coach_id", "name");

-- AddForeignKey
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coach"("coach_id") ON DELETE CASCADE ON UPDATE CASCADE;
