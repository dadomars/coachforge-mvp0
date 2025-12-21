export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ athleteId: string; assignmentId: string }> }
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
    return NextResponse.json({ error: "Atleta non trovato" }, { status: 404 });
  }

  const existing = await prisma.eventAssignment.findFirst({
    where: { assignmentId, athleteId },
    select: { assignmentId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assegnazione non trovata" }, { status: 404 });
  }

  await prisma.eventAssignment.delete({ where: { assignmentId } });

  return NextResponse.json({ ok: true });
}
