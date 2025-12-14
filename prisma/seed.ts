import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";;

async function main() {
  const email = process.env.SEED_COACH_EMAIL;
  const password = process.env.SEED_COACH_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing SEED_COACH_EMAIL or SEED_COACH_PASSWORD in env (.env.local / .env)."
    );
  }

  const existing = await prisma.coach.findUnique({ where: { email } });

  if (existing) {
    console.log(`Seed: coach already exists (${email}). No changes.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.coach.create({
    data: {
      email,
      passwordHash,
      name: "Coach Owner",
      roundingIncrementKg: 1,
    },
  });

  console.log(`Seed: coach created (${email}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });