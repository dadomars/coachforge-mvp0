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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const { exerciseId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const exercise = await prisma.exercise.findFirst({
    where: { exerciseId, coachId: session.uid },
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

  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  return NextResponse.json(exercise);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const { exerciseId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.exercise.findFirst({
    where: { exerciseId, coachId: session.uid },
    select: { exerciseId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  const data: {
    name?: string;
    category?: ExerciseCategory;
    notesPublic?: string;
    notesPrivate?: string;
  } = {};

  if (body && typeof body === "object") {
    if ("name" in body) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return badRequest("name obbligatorio");
      data.name = name;
    }

    if ("category" in body) {
      const raw = typeof body.category === "string" ? body.category.trim() : "";
      if (!raw || !isValidCategory(raw)) return badRequest("category non valida");
      data.category = raw;
    }

    if ("notesPublic" in body) {
      data.notesPublic = typeof body.notesPublic === "string" ? body.notesPublic : "";
    }

    if ("notesPrivate" in body) {
      data.notesPrivate = typeof body.notesPrivate === "string" ? body.notesPrivate : "";
    }
  }

  if (Object.keys(data).length === 0) {
    return badRequest("Nessun campo valido");
  }

  try {
    const updated = await prisma.exercise.update({
      where: { exerciseId },
      data,
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

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Esercizio già esistente" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const { exerciseId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deleted = await prisma.exercise.deleteMany({
    where: { exerciseId, coachId: session.uid },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
