-- CreateEnum
CREATE TYPE "SessionAssignmentStatus" AS ENUM ('TODO', 'DONE', 'SKIPPED');

-- AlterTable
ALTER TABLE "session_assignment" ADD COLUMN     "duration_min" INTEGER,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "performed_at" TIMESTAMP(3),
ADD COLUMN     "rpe" INTEGER,
ADD COLUMN     "status" "SessionAssignmentStatus" NOT NULL DEFAULT 'TODO';
