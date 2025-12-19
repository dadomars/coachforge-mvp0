-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('HYROX', 'CROSSFIT', 'RUN', 'ALTRO');

-- AlterTable
ALTER TABLE "competition" ADD COLUMN "notes_public" TEXT NOT NULL DEFAULT '';
ALTER TABLE "competition" ADD COLUMN "notes_private" TEXT NOT NULL DEFAULT '';
ALTER TABLE "competition" ADD COLUMN "type" "CompetitionType" NOT NULL DEFAULT 'ALTRO';
ALTER TABLE "competition" ADD COLUMN "link" TEXT;

-- AlterTable
ALTER TABLE "event" ADD COLUMN "notes_public" TEXT NOT NULL DEFAULT '';
ALTER TABLE "event" ADD COLUMN "notes_private" TEXT NOT NULL DEFAULT '';
ALTER TABLE "event" ADD COLUMN "link" TEXT;

-- Data migration (preserve existing notes)
UPDATE "competition" SET "notes_private" = COALESCE("notes_private",'') || CASE WHEN "notes" IS NULL THEN '' ELSE "notes" END;
UPDATE "event" SET "notes_private" = COALESCE("notes_private",'') || CASE WHEN "notes" IS NULL THEN '' ELSE "notes" END;

-- AlterTable
ALTER TABLE "competition" DROP COLUMN "notes";
ALTER TABLE "event" DROP COLUMN "notes";
