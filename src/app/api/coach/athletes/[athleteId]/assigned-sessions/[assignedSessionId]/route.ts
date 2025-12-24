export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ athleteId: string; assignedSessionId: string }> }
) {
  const { athleteId, assignedSessionId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const athlete = await prisma.athlete.findFirst({
    where: { athleteId, coachId: session.uid },
    select: { athleteId: true },
  });

  if (!athlete) {
    return NextResponse.json({ error: "Atleta non trovato" }, { status: 404 });
  }

  const assignedSession = await prisma.assignedSession.findFirst({
    where: {
      assignedSessionId,
      athleteId,
      coachId: session.uid,
    },
    select: {
      assignedSessionId: true,
      coachId: true,
      athleteId: true,
      templateId: true,
      date: true,
      title: true,
      notesPublic: true,
      notesPrivate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      blocks: {
        orderBy: { sortOrder: "asc" },
        select: {
          blockId: true,
          name: true,
          sortOrder: true,
          rows: {
            orderBy: { sortOrder: "asc" },
            select: {
              rowId: true,
              exerciseId: true,
              sortOrder: true,
              sets: true,
              reps: true,
              rest: true,
              percent: true,
              kg: true,
              notesPublic: true,
              notesPrivate: true,
            },
          },
        },
      },
    },
  });

  if (!assignedSession) {
    return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
  }

  return NextResponse.json(assignedSession);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ athleteId: string; assignedSessionId: string }> }
) {
  const { athleteId, assignedSessionId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const athlete = await prisma.athlete.findFirst({
    where: { athleteId, coachId: session.uid },
    select: { athleteId: true },
  });

  if (!athlete) {
    return NextResponse.json({ error: "Atleta non trovato" }, { status: 404 });
  }

  const deleted = await prisma.assignedSession.deleteMany({
    where: {
      assignedSessionId,
      athleteId,
      coachId: session.uid,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
