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

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.event.findUnique({
    where: { eventId },
    select: { eventId: true, coachId: true, dateStart: true },
  });

  if (!existing || existing.coachId !== session.uid) {
    return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  const data: {
    name?: string;
    dateStart?: Date;
    dateEnd?: Date | null;
    location?: string | null;
    link?: string | null;
    notesPublic?: string;
    notesPrivate?: string;
    status?: ValidStatus;
    typeLabel?: string;
  } = {};

  if (body && typeof body === "object") {
    if ("name" in body) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return badRequest("name obbligatorio");
      data.name = name;
    }

    if ("dateStart" in body) {
      const raw = typeof body.dateStart === "string" ? body.dateStart.trim() : "";
      if (!raw) return badRequest("dateStart non valida");
      const parsed = parseDateInput(raw);
      if (!parsed) return badRequest("dateStart non valida");
      data.dateStart = parsed;
    }

    if ("dateEnd" in body) {
      const raw = typeof body.dateEnd === "string" ? body.dateEnd.trim() : "";
      if (!raw) {
        data.dateEnd = null;
      } else {
        const parsed = parseDateInput(raw);
        if (!parsed) return badRequest("dateEnd non valida");
        data.dateEnd = parsed;
      }
    }

    if ("location" in body) {
      const raw = typeof body.location === "string" ? body.location.trim() : "";
      data.location = raw ? raw : null;
    }

    if ("link" in body) {
      const raw = typeof body.link === "string" ? body.link.trim() : "";
      if (raw && !isValidUrl(raw)) return badRequest("link non valido");
      data.link = raw ? raw : null;
    }

    if ("notesPublic" in body) {
      data.notesPublic = typeof body.notesPublic === "string" ? body.notesPublic : "";
    }

    if ("notesPrivate" in body) {
      data.notesPrivate =
        typeof body.notesPrivate === "string" ? body.notesPrivate : "";
    }

    if ("status" in body) {
      const raw = typeof body.status === "string" ? body.status.trim() : "";
      if (!isValidStatus(raw)) return badRequest("status non valido");
      data.status = raw;
    }

    if ("typeLabel" in body) {
      const raw = typeof body.typeLabel === "string" ? body.typeLabel.trim() : "";
      data.typeLabel = raw || "ALTRO";
    }
  }

  const finalDateStart = data.dateStart ?? existing.dateStart;
  if ("dateEnd" in data && data.dateEnd && data.dateEnd < finalDateStart) {
    return badRequest("dateEnd deve essere >= dateStart");
  }

  const updated = await prisma.event.update({
    where: { eventId },
    data,
    select: {
      eventId: true,
      coachId: true,
      name: true,
      dateStart: true,
      dateEnd: true,
      location: true,
      link: true,
      notesPublic: true,
      notesPrivate: true,
      status: true,
      typeLabel: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.event.findUnique({
    where: { eventId },
    select: { eventId: true, coachId: true },
  });

  if (!existing || existing.coachId !== session.uid) {
    return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.eventAssignment.deleteMany({ where: { eventId } });
    await tx.event.delete({ where: { eventId } });
  });

  return NextResponse.json({ ok: true });
}
