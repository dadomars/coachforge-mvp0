export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function parseDateInput(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
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
  const coachId = session.uid;
  if (!coachId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const athlete = await prisma.athlete.findFirst({
    where: { athleteId, coachId },
    select: { athleteId: true },
  });

  if (!athlete) {
    return NextResponse.json({ error: "Atleta non trovato" }, { status: 404 });
  }

  const url = new URL(req.url);
  const fromRaw = url.searchParams.get("from")?.trim() || "";
  const toRaw = url.searchParams.get("to")?.trim() || "";
  const from = fromRaw ? parseDateInput(fromRaw) : null;
  if (fromRaw && !from) return badRequest("from non valida");
  const to = toRaw ? parseDateInput(toRaw) : null;
  if (toRaw && !to) return badRequest("to non valida");

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = from;
  if (to) dateFilter.lte = to;

  const assignedSessions = await prisma.assignedSession.findMany({
    where: {
      athleteId,
      coachId,
      ...(from || to ? { date: dateFilter } : {}),
    },
    orderBy: { date: "desc" },
    select: {
      assignedSessionId: true,
      coachId: true,
      athleteId: true,
      templateId: true,
      date: true,
      title: true,
      notesPublic: true,
      notesPrivate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(assignedSessions);
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
  const coachId = session.uid;
  if (!coachId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const athlete = await prisma.athlete.findFirst({
    where: { athleteId, coachId },
    select: { athleteId: true },
  });

  if (!athlete) {
    return NextResponse.json({ error: "Atleta non trovato" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const templateId =
    typeof body?.templateId === "string" ? body.templateId.trim() : "";
  if (!templateId) return badRequest("templateId obbligatorio");

  const dateRaw = typeof body?.date === "string" ? body.date.trim() : "";
  if (!dateRaw) return badRequest("date obbligatoria");
  const date = parseDateInput(dateRaw);
  if (!date) return badRequest("date non valida");

  const titleRaw = typeof body?.title === "string" ? body.title.trim() : "";

  const template = await prisma.sessionTemplate.findFirst({
    where: { sessionTemplateId: templateId, coachId },
    select: {
      sessionTemplateId: true,
      title: true,
      notesPublic: true,
      notesPrivate: true,
      blocks: {
        orderBy: { sortOrder: "asc" },
        select: {
          name: true,
          sortOrder: true,
          rows: {
            orderBy: { sortOrder: "asc" },
            select: {
              exerciseId: true,
              sortOrder: true,
              sets: true,
              reps: true,
              rest: true,
              percent: true,
              kg: true,
              notesPublic: true,
              notesPrivate: true,
            },
          },
        },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Template non trovato" }, { status: 404 });
  }

  const created = await prisma.$transaction(async (tx) => {
    return tx.assignedSession.create({
      data: {
        coachId,
        athleteId,
        templateId: template.sessionTemplateId,
        date,
        title: titleRaw || template.title,
        notesPublic: template.notesPublic ?? "",
        notesPrivate: template.notesPrivate ?? "",
        blocks: {
          create: template.blocks.map((block, blockIndex) => ({
            name: block.name,
            sortOrder: blockIndex + 1,
            rows: {
              create: block.rows.map((row, rowIndex) => ({
                exerciseId: row.exerciseId,
                sortOrder: rowIndex + 1,
                sets: row.sets,
                reps: row.reps,
                rest: row.rest,
                percent: row.percent,
                kg: row.kg,
                notesPublic: row.notesPublic,
                notesPrivate: row.notesPrivate,
              })),
            },
          })),
        },
      },
      select: {
        assignedSessionId: true,
        coachId: true,
        athleteId: true,
        templateId: true,
        date: true,
        title: true,
        notesPublic: true,
        notesPrivate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  return NextResponse.json(created, { status: 201 });
}
