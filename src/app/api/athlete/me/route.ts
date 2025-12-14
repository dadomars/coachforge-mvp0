export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth/authOptions";

import { prisma } from "@/lib/db/prisma";;

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.role !== "ATHLETE" || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const athlete = await prisma.athlete.findUnique({
    where: { athleteId: session.uid },
    select: {
      athleteId: true,
      firstName: true,
      lastName: true,
      notesPublic: true, // ✅ SOLO PUBLIC
      // ❌ notesPrivate: NON ESISTE QUI (guardia leak)
    },
  });

  if (!athlete) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
  }

  return NextResponse.json({ athlete });
}


