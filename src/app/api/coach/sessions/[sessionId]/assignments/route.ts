export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
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

  const owned = await prisma.session.findFirst({
    where: { sessionId, coachId },
    select: { sessionId: true },
  });

  if (!owned) {
    return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
  }

  const assignments = await prisma.sessionAssignment.findMany({
    where: { sessionId },
    orderBy: { assignedAt: "desc" },
    select: {
      assignmentId: true,
      athleteId: true,
      assignedAt: true,
      athlete: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(
    assignments.map((row) => ({
      assignmentId: row.assignmentId,
      athleteId: row.athleteId,
      assignedAt: row.assignedAt,
      athleteName: `${row.athlete.firstName} ${row.athlete.lastName}`.trim(),
    }))
  );
}

export async function POST(
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

  const owned = await prisma.session.findFirst({
    where: { sessionId, coachId },
    select: { sessionId: true },
  });

  if (!owned) {
    return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const athleteIdsRaw = Array.isArray(body?.athleteIds) ? body.athleteIds : [];
  const athleteIds: string[] = athleteIdsRaw
    .map((value: unknown) => (typeof value === "string" ? value.trim() : ""))
    .filter((value: string) => value.length > 0);
  if (athleteIds.length === 0) return badRequest("athleteIds obbligatorio");

  const uniqueIds: string[] = Array.from(new Set(athleteIds));
  const athletes = await prisma.athlete.findMany({
    where: { coachId, athleteId: { in: uniqueIds } },
    select: { athleteId: true },
  });
  const foundIds = new Set(athletes.map((row) => row.athleteId));
  const validIds = uniqueIds.filter((id) => foundIds.has(id));
  if (validIds.length === 0) return badRequest("Nessun atleta valido.");

  const created = await prisma.sessionAssignment.createMany({
    data: validIds.map((athleteId) => ({ sessionId, athleteId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ assigned: created.count });
}

export async function DELETE(
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

  const owned = await prisma.session.findFirst({
    where: { sessionId, coachId },
    select: { sessionId: true },
  });

  if (!owned) {
    return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : "";
  const assignmentId =
    typeof body?.assignmentId === "string" ? body.assignmentId.trim() : "";
  if (!athleteId && !assignmentId) {
    return badRequest("athleteId o assignmentId obbligatorio");
  }

  const deleted = await prisma.sessionAssignment.deleteMany({
    where: {
      sessionId,
      ...(assignmentId ? { assignmentId } : {}),
      ...(athleteId ? { athleteId } : {}),
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Assegnazione non trovata" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
