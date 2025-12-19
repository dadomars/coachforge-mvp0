export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import ForbiddenBanner from "@/components/ForbiddenBanner";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AthleteHome({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  // ✅ Next 16: searchParams può essere Promise -> unwrap
  const sp = await Promise.resolve(searchParams ?? {});

  const forbiddenRaw = sp.forbidden;
  const forbidden =
    typeof forbiddenRaw === "string"
      ? forbiddenRaw
      : Array.isArray(forbiddenRaw)
      ? forbiddenRaw[0]
      : null;

  const bannerText =
    forbidden === "coach"
      ? "Accesso negato: sei loggato come ATHLETE. L’area Coach è riservata ai coach."
      : null;

  // 1) non loggato o sessione rotta -> login atleta
  if (!session || !session.uid) {
    redirect("/athlete-login");
  }

  // 2) loggato MA ruolo sbagliato -> rimanda alla home giusta con banner
  if (session.role !== "ATHLETE") {
    redirect("/coach?forbidden=athlete");
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

        <ForbiddenBanner text={bannerText} />

        <p style={{ marginTop: 16 }}>
          Sei loggato come <b>ATHLETE</b> ✅
        </p>
        <p style={{ opacity: 0.8 }}>uid sessione: {session.uid}</p>

        <hr style={{ margin: "24px auto", maxWidth: 520 }} />

        <p>
          <b>Profilo atleta NON trovato</b> nel DB con questo uid.
        </p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          (Se succede, vuol dire che session.uid non combacia con athlete.athleteId)
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, textAlign: "center" }}>
      <h1>Area Atleta</h1>

      <ForbiddenBanner text={bannerText} />

      <p style={{ marginTop: 16 }}>
        Se vedi questa pagina, sei loggato come <b>ATHLETE</b> ✅
      </p>

      <p style={{ opacity: 0.8 }}>uid: {session.uid}</p>

      <hr style={{ margin: "24px auto", maxWidth: 520 }} />

      <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "left" }}>
        <div>
          <b>Nome:</b> {athlete.firstName} {athlete.lastName}
        </div>
        <div>
          <b>Athlete ID:</b> {athlete.athleteId}
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
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