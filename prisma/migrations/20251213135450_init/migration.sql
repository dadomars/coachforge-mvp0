-- CreateTable
CREATE TABLE "coach" (
    "coach_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "rounding_increment_kg" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_pkey" PRIMARY KEY ("coach_id")
);

-- CreateTable
CREATE TABLE "athlete" (
    "athlete_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "notes_public" TEXT,
    "notes_private" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_pkey" PRIMARY KEY ("athlete_id")
);

-- CreateTable
CREATE TABLE "athlete_auth" (
    "athlete_id" TEXT NOT NULL,
    "login_identifier" TEXT NOT NULL,
    "password_hash" TEXT,
    "activated_at" TIMESTAMP(3),

    CONSTRAINT "athlete_auth_pkey" PRIMARY KEY ("athlete_id")
);

-- CreateTable
CREATE TABLE "athlete_invite" (
    "invite_id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_invite_pkey" PRIMARY KEY ("invite_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coach_email_key" ON "coach"("email");

-- CreateIndex
CREATE INDEX "idx_athlete_coach_id" ON "athlete"("coach_id");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_auth_login_identifier_key" ON "athlete_auth"("login_identifier");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_invite_token_hash_key" ON "athlete_invite"("token_hash");

-- CreateIndex
CREATE INDEX "idx_invite_athlete_id" ON "athlete_invite"("athlete_id");

-- AddForeignKey
ALTER TABLE "athlete" ADD CONSTRAINT "athlete_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coach"("coach_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_auth" ADD CONSTRAINT "athlete_auth_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("athlete_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_invite" ADD CONSTRAINT "athlete_invite_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("athlete_id") ON DELETE CASCADE ON UPDATE CASCADE;
