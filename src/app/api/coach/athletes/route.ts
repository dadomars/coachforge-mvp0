import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "../../../../lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const firstName = body?.first_name?.trim();
  const lastName = body?.last_name?.trim();
  const notesPublic = body?.notes_public ?? null;
  const notesPrivate = body?.notes_private ?? null;

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "first_name e last_name sono obbligatori" },
      { status: 400 }
    );
  }

  const athlete = await prisma.athlete.create({
    data: {
      coachId: session.uid!,
      firstName,
      lastName,
      notesPublic,
      notesPrivate,
    },
    select: {
      athleteId: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    athlete_id: athlete.athleteId,
    first_name: athlete.firstName,
    last_name: athlete.lastName,
    created_at: athlete.createdAt,
  });
}