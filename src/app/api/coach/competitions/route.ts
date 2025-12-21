export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

const VALID_STATUSES = ["PLANNED", "DONE", "CANCELLED"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

const VALID_TYPES = ["HYROX", "CROSSFIT", "RUN", "ALTRO"] as const;
type ValidType = (typeof VALID_TYPES)[number];

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

function isValidType(value: string): value is ValidType {
  return (VALID_TYPES as readonly string[]).includes(value);
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

  const competitions = await prisma.competition.findMany({
    where: { coachId: session.uid },
    orderBy: { dateStart: "desc" },
    select: {
      competitionId: true,
      coachId: true,
      name: true,
      dateStart: true,
      dateEnd: true,
      location: true,
      link: true,
      notesPublic: true,
      notesPrivate: true,
      status: true,
      type: true,
    },
  });

  return NextResponse.json(competitions);
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

  const startDateRaw =
    typeof body?.startDate === "string" ? body.startDate.trim() : "";
  if (!startDateRaw) return badRequest("startDate obbligatoria");
  const dateStart = parseDateInput(startDateRaw);
  if (!dateStart) return badRequest("startDate non valida");

  const endDateRaw =
    typeof body?.endDate === "string" ? body.endDate.trim() : "";
  const dateEnd = endDateRaw ? parseDateInput(endDateRaw) : null;
  if (endDateRaw && !dateEnd) return badRequest("endDate non valida");
  if (dateEnd && dateEnd < dateStart)
    return badRequest("endDate deve essere >= startDate");

  const statusRaw =
    typeof body?.status === "string" ? body.status.trim() : "";
  if (!statusRaw) return badRequest("status obbligatorio");
  if (!isValidStatus(statusRaw)) return badRequest("status non valido");
  const status = statusRaw;

  const typeRaw = typeof body?.type === "string" ? body.type.trim() : "";
  if (!typeRaw) return badRequest("type obbligatorio");
  if (!isValidType(typeRaw)) return badRequest("type non valido");
  const type = typeRaw;

  const notesPublic = typeof body?.notesPublic === "string" ? body.notesPublic : "";
  const notesPrivate =
    typeof body?.notesPrivate === "string" ? body.notesPrivate : "";

  const locationRaw =
    typeof body?.location === "string" ? body.location.trim() : "";
  const location = locationRaw ? locationRaw : null;

  const linkRaw = typeof body?.link === "string" ? body.link.trim() : "";
  if (linkRaw && !isValidUrl(linkRaw)) return badRequest("link non valido");
  const link = linkRaw ? linkRaw : null;

  const fallbackAthlete = await prisma.athlete.findFirst({
    where: { coachId: session.uid },
    select: { athleteId: true },
  });

  if (!fallbackAthlete) {
    return NextResponse.json(
      { error: "No athletes available for legacy schema" },
      { status: 409 }
    );
  }

  const created = await prisma.competition.create({
    data: {
      coachId: session.uid,
      athleteId: fallbackAthlete.athleteId,
      name,
      dateStart,
      dateEnd,
      location,
      link,
      notesPublic,
      notesPrivate,
      status,
      type,
    },
    select: {
      competitionId: true,
      coachId: true,
      name: true,
      dateStart: true,
      dateEnd: true,
      location: true,
      link: true,
      notesPublic: true,
      notesPrivate: true,
      status: true,
      type: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
