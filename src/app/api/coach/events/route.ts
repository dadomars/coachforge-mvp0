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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await prisma.event.findMany({
    where: { coachId: session.uid },
    orderBy: { dateStart: "desc" },
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

  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return badRequest("name obbligatorio");

  const dateStartRaw =
    typeof body?.dateStart === "string" ? body.dateStart.trim() : "";
  if (!dateStartRaw) return badRequest("dateStart obbligatoria");
  const dateStart = parseDateInput(dateStartRaw);
  if (!dateStart) return badRequest("dateStart non valida");

  const dateEndRaw =
    typeof body?.dateEnd === "string" ? body.dateEnd.trim() : "";
  const dateEnd = dateEndRaw ? parseDateInput(dateEndRaw) : null;
  if (dateEndRaw && !dateEnd) return badRequest("dateEnd non valida");
  if (dateEnd && dateEnd < dateStart)
    return badRequest("dateEnd deve essere >= dateStart");

  const statusRaw =
    typeof body?.status === "string" ? body.status.trim() : "";
  if (!statusRaw) return badRequest("status obbligatorio");
  if (!isValidStatus(statusRaw)) return badRequest("status non valido");
  const status = statusRaw;

  const typeLabelRaw =
    typeof body?.typeLabel === "string" ? body.typeLabel.trim() : "";
  const typeLabel = typeLabelRaw || "ALTRO";

  const notesPublic = typeof body?.notesPublic === "string" ? body.notesPublic : "";
  const notesPrivate =
    typeof body?.notesPrivate === "string" ? body.notesPrivate : "";

  const locationRaw =
    typeof body?.location === "string" ? body.location.trim() : "";
  const location = locationRaw ? locationRaw : null;

  const linkRaw = typeof body?.link === "string" ? body.link.trim() : "";
  if (linkRaw && !isValidUrl(linkRaw)) return badRequest("link non valido");
  const link = linkRaw ? linkRaw : null;

  const created = await prisma.event.create({
    data: {
      coachId: session.uid,
      athleteId: null,
      name,
      dateStart,
      dateEnd,
      location,
      link,
      notesPublic,
      notesPrivate,
      status,
      typeLabel,
    },
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

  return NextResponse.json(created, { status: 201 });
}
