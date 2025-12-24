"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function AssignedSessionDetailPage() {
  const params = useParams<{ sessionId: string | string[] }>();
  const sessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : params.sessionId;

  return (
    <main style={{ maxWidth: 980, margin: "36px auto", padding: 16 }}>
      <section style={{ display: "grid", gap: 12 }}>
        <Link href="/coach/assigned-sessions" style={{ textDecoration: "underline" }}>
          ← Torna alle sessioni
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Sessione assegnata</h1>
        <p>In arrivo</p>
        {sessionId ? (
          <p style={{ opacity: 0.7 }}>
            ID: <code>{sessionId}</code>
          </p>
        ) : null}
      </section>
    </main>
  );
}
