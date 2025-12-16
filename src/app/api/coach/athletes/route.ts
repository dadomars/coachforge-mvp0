export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth/authOptions";

const prisma = new PrismaClient();

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.role !== "COACH" || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const athletes = await prisma.athlete.findMany({
    where: { coachId: session.uid },
    orderBy: { createdAt: "desc" },
    select: {
      athleteId: true,
      firstName: true,
      lastName: true,
      notesPublic: true,
      createdAt: true,
      auth: {
        select: {
          activatedAt: true, // ✅ SSOT: athlete_auth.activated_at
        },
      },
    },
  });

  // ✅ Response piatta: la UI può leggere direttamente activatedAt (string|null via JSON)
  const out = athletes.map((a) => ({
    athleteId: a.athleteId,
    firstName: a.firstName,
    lastName: a.lastName,
    notesPublic: a.notesPublic,
    createdAt: a.createdAt,
    activatedAt: a.auth?.activatedAt ?? null,
  }));

  return NextResponse.json(out);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.role !== "COACH" || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const notesPublic =
    typeof body?.notesPublic === "string" && body.notesPublic.trim().length > 0
      ? body.notesPublic.trim()
      : null;

  if (firstName.length < 2) return badRequest("firstName obbligatorio (min 2)");
  if (lastName.length < 2) return badRequest("lastName obbligatorio (min 2)");

  const created = await prisma.athlete.create({
    data: {
      coachId: session.uid,
      firstName,
      lastName,
      notesPublic,
    },
    select: {
      athleteId: true,
      firstName: true,
      lastName: true,
      notesPublic: true,
      createdAt: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
