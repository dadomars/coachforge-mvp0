import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import AssignedSessionDetailClient from "./AssignedSessionDetailClient";

type PageProps = {
  params: { sessionId: string } | Promise<{ sessionId: string }>;
  searchParams?:
    | { returnTo?: string | string[] }
    | Promise<{ returnTo?: string | string[] }>;
};

export default async function AssignedSessionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const p = await Promise.resolve(params);
  const sp = await Promise.resolve(searchParams ?? {});
  const sessionId = p.sessionId;
  const returnToRaw = sp.returnTo;
  const returnTo =
    typeof returnToRaw === "string"
      ? returnToRaw
      : Array.isArray(returnToRaw)
      ? returnToRaw[0]
      : undefined;

  if (!sessionId || sessionId === "new") {
    return <AssignedSessionDetailClient />;
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.uid || session.role !== "COACH") {
    return <AssignedSessionDetailClient />;
  }

  const coachId = session.uid;

  const assignedSession = await prisma.assignedSession.findFirst({
    where: { assignedSessionId: sessionId, coachId },
    select: { assignedSessionId: true },
  });

  if (!assignedSession) {
    const legacySession = await prisma.session.findFirst({
      where: { sessionId, coachId },
      select: { sessionId: true },
    });

    if (legacySession) {
      const assignment = await prisma.sessionAssignment.findFirst({
        where: { sessionId },
        select: { athleteId: true },
      });
      const fallbackReturnTo = assignment?.athleteId
        ? `/coach/athletes/${assignment.athleteId}`
        : "/coach/sessions";
      const nextReturnTo = returnTo ?? fallbackReturnTo;
      const qs = nextReturnTo
        ? `?returnTo=${encodeURIComponent(nextReturnTo)}`
        : "";
      redirect(`/coach/sessions/${sessionId}${qs}`);
    }
  }

  return <AssignedSessionDetailClient />;
}
