export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

const VALID_CATEGORIES = ["WEIGHTLIFTING", "GYM", "METCON", "RUN", "ERG", "ALTRO"] as const;
type ExerciseCategory = (typeof VALID_CATEGORIES)[number];

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function isValidCategory(value: string): value is ExerciseCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.exercise.findMany({
    where: { coachId: session.uid },
    orderBy: { updatedAt: "desc" },
    select: {
      exerciseId: true,
      coachId: true,
      name: true,
      category: true,
      notesPublic: true,
      notesPrivate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return badRequest("name obbligatorio");

  let category: ExerciseCategory = "ALTRO";
  if (body && typeof body === "object" && "category" in body) {
    const raw = typeof body.category === "string" ? body.category.trim() : "";
    if (raw) {
      if (!isValidCategory(raw)) return badRequest("category non valida");
      category = raw;
    }
  }

  const notesPublic =
    typeof body?.notesPublic === "string" ? body.notesPublic : "";
  const notesPrivate =
    typeof body?.notesPrivate === "string" ? body.notesPrivate : "";

  try {
    const created = await prisma.exercise.create({
      data: {
        coachId: session.uid,
        name,
        category,
        notesPublic,
        notesPrivate,
      },
      select: {
        exerciseId: true,
        coachId: true,
        name: true,
        category: true,
        notesPublic: true,
        notesPrivate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Esercizio già esistente" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}
