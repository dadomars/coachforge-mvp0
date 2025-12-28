export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

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

  const assignments = await prisma.sessionAssignment.findMany({
    where: {
      athleteId,
      session: { coachId: session.uid },
    },
    orderBy: { assignedAt: "desc" },
    select: {
      assignmentId: true,
      assignedAt: true,
      session: {
        select: {
          sessionId: true,
          title: true,
          sessionDate: true,
          notesPublic: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json(
    assignments.map((assignment) => ({
      assignmentId: assignment.assignmentId,
      assignedAt: assignment.assignedAt,
      sessionId: assignment.session.sessionId,
      title: assignment.session.title,
      sessionDate: assignment.session.sessionDate,
      notesPublic: assignment.session.notesPublic,
      createdAt: assignment.session.createdAt,
    }))
  );
}
