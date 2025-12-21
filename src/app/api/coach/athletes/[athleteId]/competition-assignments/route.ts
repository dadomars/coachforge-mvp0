export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

const COMPETITION_SELECT = {
  competitionId: true,
  name: true,
  type: true,
  dateStart: true,
  dateEnd: true,
  location: true,
  link: true,
  status: true,
  notesPublic: true,
  notesPrivate: true,
} as const;

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
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
  }

  const assignments = await prisma.competitionAssignment.findMany({
    where: { athleteId },
    orderBy: { competition: { dateStart: "desc" } },
    select: {
      assignmentId: true,
      isTarget: true,
      assignedAt: true,
      competition: { select: COMPETITION_SELECT },
    },
  });

  return NextResponse.json(
    assignments.map((assignment) => ({
      id: assignment.assignmentId,
      isTarget: assignment.isTarget,
      assignedAt: assignment.assignedAt,
      competition: assignment.competition,
    }))
  );
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
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const competitionId =
    typeof body?.competitionId === "string" ? body.competitionId.trim() : "";
  if (!competitionId) return badRequest("competitionId obbligatorio");

  const isTarget = typeof body?.isTarget === "boolean" ? body.isTarget : undefined;

  const competition = await prisma.competition.findUnique({
    where: { competitionId },
    select: { competitionId: true, coachId: true },
  });

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }
  if (competition.coachId !== session.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignment = await prisma.$transaction(async (tx) => {
    const upserted = await tx.competitionAssignment.upsert({
      where: {
        athleteId_competitionId: {
          athleteId,
          competitionId,
        },
      },
      update: {},
      create: {
        athleteId,
        competitionId,
        isTarget: isTarget === true,
      },
      select: { assignmentId: true },
    });

    if (isTarget === true) {
      await tx.competitionAssignment.updateMany({
        where: { athleteId, NOT: { assignmentId: upserted.assignmentId } },
        data: { isTarget: false },
      });

      return tx.competitionAssignment.update({
        where: { assignmentId: upserted.assignmentId },
        data: { isTarget: true },
        select: {
          assignmentId: true,
          isTarget: true,
          assignedAt: true,
          competition: { select: COMPETITION_SELECT },
        },
      });
    }

    return tx.competitionAssignment.findUnique({
      where: { assignmentId: upserted.assignmentId },
      select: {
        assignmentId: true,
        isTarget: true,
        assignedAt: true,
        competition: { select: COMPETITION_SELECT },
      },
    });
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: assignment.assignmentId,
    isTarget: assignment.isTarget,
    assignedAt: assignment.assignedAt,
    competition: assignment.competition,
  });
}
