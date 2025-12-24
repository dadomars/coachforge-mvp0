export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function parseDateInput(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const coachId = session.uid;

  const sessions = await prisma.assignedSession.findMany({
    where: { coachId },
    orderBy: { date: "desc" },
    take: 50,
    select: {
      assignedSessionId: true,
      athleteId: true,
      date: true,
      title: true,
      status: true,
      athlete: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  const payload = sessions.map((row) => ({
    sessionId: row.assignedSessionId,
    athleteId: row.athleteId,
    athleteName: `${row.athlete.firstName} ${row.athlete.lastName}`.trim(),
    date: row.date,
    title: row.title,
    status: row.status,
  }));

  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const coachId = session.uid;

  const body = await req.json().catch(() => null);
  const athleteId =
    typeof body?.athleteId === "string" ? body.athleteId.trim() : "";
  if (!athleteId) return badRequest("athleteId obbligatorio");

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return badRequest("title obbligatorio");

  const dateRaw = typeof body?.date === "string" ? body.date.trim() : "";
  if (!dateRaw) return badRequest("date obbligatoria");
  const date = parseDateInput(dateRaw);
  if (!date) return badRequest("date non valida");

  const athlete = await prisma.athlete.findFirst({
    where: { athleteId, coachId },
    select: { athleteId: true, firstName: true, lastName: true },
  });

  if (!athlete) {
    return NextResponse.json({ error: "Atleta non trovato" }, { status: 404 });
  }

  const created = await prisma.assignedSession.create({
    data: {
      coachId,
      athleteId,
      date,
      title,
    },
    select: {
      assignedSessionId: true,
      athleteId: true,
      date: true,
      title: true,
      status: true,
    },
  });

  return NextResponse.json(
    {
      sessionId: created.assignedSessionId,
      athleteId: created.athleteId,
      athleteName: `${athlete.firstName} ${athlete.lastName}`.trim(),
      date: created.date,
      title: created.title,
      status: created.status,
    },
    { status: 201 }
  );
}
