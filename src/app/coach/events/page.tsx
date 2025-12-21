"use client";
import Link from "next/link";
export default function CoachEventsPage() {
  return (
    <main style={{ maxWidth: 980, margin: "36px auto", padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
  <Link href="/coach" style={{ textDecoration: "underline" }}>
    ← Torna al coach
  </Link>
</div>
      <section style={{ display: "grid", gap: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Eventi</h1>
        <p>In arrivo</p>
        <p>Placeholder: qui gestiremo la libreria eventi e le assegnazioni.</p>
      </section>
    </main>
  );
}
