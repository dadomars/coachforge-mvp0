export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

const VALID_STATUSES = ["PLANNED", "DONE", "CANCELLED"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function parseDateInput(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isValidStatus(value: string): value is ValidStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const coachId = session.uid;

  const assignedSession = await prisma.assignedSession.findFirst({
    where: { assignedSessionId: sessionId, coachId },
    select: {
      assignedSessionId: true,
      coachId: true,
      athleteId: true,
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const coachId = session.uid;

  const existing = await prisma.assignedSession.findFirst({
    where: { assignedSessionId: sessionId, coachId },
    select: { assignedSessionId: true, date: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Payload non valido.");

  const data: {
    title?: string;
    date?: Date;
    status?: ValidStatus;
    notesPublic?: string;
    notesPrivate?: string;
  } = {};

  if ("title" in body) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return badRequest("title non valido");
    data.title = title;
  }

  if ("date" in body) {
    const raw = typeof body.date === "string" ? body.date.trim() : "";
    if (!raw) return badRequest("date non valida");
    const parsed = parseDateInput(raw);
    if (!parsed) return badRequest("date non valida");
    data.date = parsed;
  }

  if ("status" in body) {
    const raw = typeof body.status === "string" ? body.status.trim() : "";
    if (!raw || !isValidStatus(raw)) return badRequest("status non valido");
    data.status = raw;
  }

  if ("notesPublic" in body) {
    data.notesPublic = typeof body.notesPublic === "string" ? body.notesPublic : "";
  }

  if ("notesPrivate" in body) {
    data.notesPrivate =
      typeof body.notesPrivate === "string" ? body.notesPrivate : "";
  }

  const updated = await prisma.assignedSession.update({
    where: { assignedSessionId: sessionId },
    data,
    select: {
      assignedSessionId: true,
      athleteId: true,
      date: true,
      title: true,
      status: true,
    },
  });

  return NextResponse.json({
    sessionId: updated.assignedSessionId,
    athleteId: updated.athleteId,
    date: updated.date,
    title: updated.title,
    status: updated.status,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const coachId = session.uid;

  const deleted = await prisma.assignedSession.deleteMany({
    where: { assignedSessionId: sessionId, coachId },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
