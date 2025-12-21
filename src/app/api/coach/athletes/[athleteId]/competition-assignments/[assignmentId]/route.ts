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

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ athleteId: string; assignmentId: string }>;
  }
) {
  const { athleteId, assignmentId } = await params;

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

  const existing = await prisma.competitionAssignment.findFirst({
    where: { assignmentId, athleteId },
    select: { assignmentId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.isTarget !== "boolean") {
    return badRequest("isTarget non valido");
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (body.isTarget === true) {
      await tx.competitionAssignment.updateMany({
        where: { athleteId, NOT: { assignmentId } },
        data: { isTarget: false },
      });
    }

    return tx.competitionAssignment.update({
      where: { assignmentId },
      data: { isTarget: body.isTarget },
      select: {
        assignmentId: true,
        isTarget: true,
        assignedAt: true,
        competition: { select: COMPETITION_SELECT },
      },
    });
  });

  return NextResponse.json({
    id: updated.assignmentId,
    isTarget: updated.isTarget,
    assignedAt: updated.assignedAt,
    competition: updated.competition,
  });
}

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ athleteId: string; assignmentId: string }>;
  }
) {
  const { athleteId, assignmentId } = await params;

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

  const existing = await prisma.competitionAssignment.findFirst({
    where: { assignmentId, athleteId },
    select: { assignmentId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.competitionAssignment.delete({ where: { assignmentId } });

  return NextResponse.json({ ok: true });
}
