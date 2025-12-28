export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

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

  const detail = await prisma.session.findFirst({
    where: { sessionId, coachId: session.uid },
    select: {
      sessionId: true,
      title: true,
      sessionDate: true,
      notesPublic: true,
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
              exercise: {
                select: {
                  exerciseId: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!detail) {
    return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
