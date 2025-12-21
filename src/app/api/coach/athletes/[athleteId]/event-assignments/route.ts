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
  { params }: { params: Promise<{ athleteId: string }> }
) {
  const { athleteId } = await params;

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

  const assignments = await prisma.eventAssignment.findMany({
    where: { athleteId },
    select: {
      assignmentId: true,
      athleteId: true,
      eventId: true,
      assignedAt: true,
    },
  });

  return NextResponse.json(assignments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  const { athleteId } = await params;

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

  const body = await req.json().catch(() => null);
  const eventId = typeof body?.eventId === "string" ? body.eventId.trim() : "";
  if (!eventId) return badRequest("eventId obbligatorio");

  const event = await prisma.event.findUnique({
    where: { eventId },
    select: { eventId: true, coachId: true },
  });

  if (!event || event.coachId !== session.uid) {
    return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  }

  const assignment = await prisma.eventAssignment.upsert({
    where: {
      athleteId_eventId: {
        athleteId,
        eventId,
      },
    },
    update: {},
    create: {
      athleteId,
      eventId,
    },
    select: {
      assignmentId: true,
      athleteId: true,
      eventId: true,
      assignedAt: true,
    },
  });

  return NextResponse.json(assignment);
}
