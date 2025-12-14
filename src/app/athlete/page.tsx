export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth/authOptions";

import { prisma } from "@/lib/db/prisma";;

export default async function AthleteHome() {
  const session = await getServerSession(authOptions);

  if (!session || session.role !== "ATHLETE" || !session.uid) {
    redirect("/athlete-login");
  }

  const athlete = await prisma.athlete.findUnique({
    where: { athleteId: session.uid },
    select: {
      athleteId: true,
      firstName: true,
      lastName: true,
      notesPublic: true, // ✅ SOLO PUBLIC
      // ❌ notesPrivate: MAI QUI
    },
  });

  if (!athlete) {
    return (
      <main style={{ padding: 32, textAlign: "center" }}>
        <h1>Area Atleta</h1>
        <p>Sei loggato come <b>ATHLETE</b> ✅</p>
        <p style={{ opacity: 0.8 }}>uid sessione: {session.uid}</p>
        <hr style={{ margin: "24px auto", maxWidth: 520 }} />
        <p><b>Profilo atleta NON trovato</b> nel DB con questo uid.</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          (Se succede, vuol dire che session.uid non combacia con athlete.athleteId)
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, textAlign: "center" }}>
      <h1>Area Atleta</h1>

      <p>
        Se vedi questa pagina, sei loggato come <b>ATHLETE</b> ✅
      </p>

      <p style={{ opacity: 0.8 }}>
        uid: {session.uid}
      </p>

      <hr style={{ margin: "24px auto", maxWidth: 520 }} />

      <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "left" }}>
        <div><b>Nome:</b> {athlete.firstName} {athlete.lastName}</div>
        <div><b>Athlete ID:</b> {athlete.athleteId}</div>

        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Note (VISIBILI all’atleta)
          </div>
          <div>{athlete.notesPublic ?? "—"}</div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          Nota: qui non esiste accesso a notesPrivate. Se la vedi da qualche parte, è un leak.
        </div>
      </div>
    </main>
  );
}