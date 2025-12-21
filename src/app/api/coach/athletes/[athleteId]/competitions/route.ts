import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEPRECATED_RESPONSE = {
  error: "DEPRECATED_ENDPOINT",
  message:
    "Use /api/coach/competitions and /api/coach/athletes/[athleteId]/competition-assignments instead.",
};

function gone() {
  return NextResponse.json(DEPRECATED_RESPONSE, { status: 410 });
}

export const GET = gone;
export const POST = gone;
export const PATCH = gone;
export const DELETE = gone;
