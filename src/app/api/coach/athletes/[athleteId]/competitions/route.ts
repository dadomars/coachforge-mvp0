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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  const { athleteId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.role !== "COACH" || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const athlete = await prisma.athlete.findFirst({
    where: { athleteId, coachId: session.uid },
    select: { athleteId: true },
  });

  if (!athlete) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
  }

  const competitions = await prisma.competition.findMany({
    where: { athleteId },
    orderBy: { dateStart: "asc" },
    select: {
      competitionId: true,
      athleteId: true,
      name: true,
      dateStart: true,
      dateEnd: true,
      location: true,
      link: true,
      notesPublic: true,
      notesPrivate: true,
      status: true,
      type: true,
      isTarget: true,
    },
  });

  return NextResponse.json(competitions);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  const { athleteId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.role !== "COACH" || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const athlete = await prisma.athlete.findFirst({
    where: { athleteId, coachId: session.uid },
    select: { athleteId: true },
  });

  if (!athlete) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
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
    typeof body?.status === "string" ? body.status.trim() : "PLANNED";
  const status = isValidStatus(statusRaw) ? statusRaw : "PLANNED";

  const typeRaw = typeof body?.type === "string" ? body.type.trim() : "ALTRO";
  const type = isValidType(typeRaw) ? typeRaw : "ALTRO";

  const notesPublic = typeof body?.notesPublic === "string" ? body.notesPublic : "";
  const notesPrivate =
    typeof body?.notesPrivate === "string" ? body.notesPrivate : "";

  const locationRaw =
    typeof body?.location === "string" ? body.location.trim() : "";
  const location = locationRaw ? locationRaw : null;

  const linkRaw = typeof body?.link === "string" ? body.link.trim() : "";
  if (linkRaw && !isValidUrl(linkRaw)) return badRequest("link non valido");
  const link = linkRaw ? linkRaw : null;

  const isTarget = typeof body?.isTarget === "boolean" ? body.isTarget : false;

  const created = await prisma.$transaction(async (tx) => {
    if (isTarget) {
      await tx.competition.updateMany({
        where: { athleteId },
        data: { isTarget: false },
      });
    }

    return tx.competition.create({
      data: {
        athleteId,
        name,
        dateStart,
        dateEnd,
        location,
        link,
        notesPublic,
        notesPrivate,
        status,
        type,
        isTarget,
      },
      select: {
        competitionId: true,
        athleteId: true,
        name: true,
        dateStart: true,
        dateEnd: true,
        location: true,
        link: true,
        notesPublic: true,
        notesPrivate: true,
        status: true,
        type: true,
        isTarget: true,
      },
    });
  });

  return NextResponse.json(created, { status: 201 });
}
