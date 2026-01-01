export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

const VALID_STATUSES = ["TODO", "DONE", "SKIPPED"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function parseDateInput(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const { assignmentId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.sessionAssignment.findFirst({
    where: {
      assignmentId,
      athlete: { coachId: session.uid },
    },
    select: { assignmentId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Payload non valido.");

  const data: {
    status?: ValidStatus;
    performedAt?: Date | null;
    durationMin?: number | null;
    rpe?: number | null;
    note?: string | null;
  } = {};

  if ("status" in body) {
    const raw = typeof body.status === "string" ? body.status.trim() : "";
    if (!raw || !VALID_STATUSES.includes(raw as ValidStatus)) {
      return badRequest("status non valido");
    }
    data.status = raw as ValidStatus;
  }

  if ("performedAt" in body) {
    const raw =
      typeof body.performedAt === "string" ? body.performedAt.trim() : "";
    if (!raw) {
      data.performedAt = null;
    } else {
      const parsed = parseDateInput(raw);
      if (!parsed) return badRequest("performedAt non valida");
      data.performedAt = parsed;
    }
  }

  if ("durationMin" in body) {
    if (body.durationMin == null || body.durationMin === "") {
      data.durationMin = null;
    } else {
      const value = Number(body.durationMin);
      if (!Number.isFinite(value) || value <= 0) {
        return badRequest("durationMin non valida");
      }
      data.durationMin = Math.trunc(value);
    }
  }

  if ("rpe" in body) {
    if (body.rpe == null || body.rpe === "") {
      data.rpe = null;
    } else {
      const value = Number(body.rpe);
      if (!Number.isFinite(value) || value < 1 || value > 10) {
        return badRequest("rpe non valido");
      }
      data.rpe = Math.trunc(value);
    }
  }

  if ("note" in body) {
    data.note = typeof body.note === "string" ? body.note : null;
  }

  const updated = await prisma.sessionAssignment.update({
    where: { assignmentId },
    data,
    select: {
      assignmentId: true,
      status: true,
      performedAt: true,
      durationMin: true,
      rpe: true,
      note: true,
      assignedAt: true,
      sessionId: true,
    },
  });

  return NextResponse.json(updated);
}
