import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

export default async function CoachHome() {
  const session = await getServerSession(authOptions);

  if (!session || session.role !== "COACH") {
    redirect("/coach-login");
  }

  return (
    <main style={{ padding: 32, fontFamily: "system-ui" }}>
      <h1>Area Coach</h1>
      <p>
        Se vedi questa pagina, sei loggato come <b>COACH</b> ✅
      </p>
      <p>
        uid: <code>{session.uid}</code>
      </p>

      <hr style={{ margin: "24px 0" }} />

      <h3>Test rapidi</h3>
      <ul>
        <li>
          Vai su <code>/athlete</code> → deve bloccare/redirect (RBAC).
        </li>
        <li>
          Per Test 3 (invito one-time), usa la Console del browser qui su <code>/coach</code>.
        </li>
      </ul>

      <p style={{ marginTop: 24, opacity: 0.7 }}>
        Nota: questa è una pagina placeholder MVP-0. Niente UI extra.
      </p>
    </main>
  );
}