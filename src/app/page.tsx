import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 520, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontSize: 34, marginBottom: 10 }}>CoachForge</h1>
      <p style={{ marginBottom: 20, opacity: 0.8 }}>
        Scegli come vuoi entrare.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        <Link
          href="/coach-login"
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #333",
            textAlign: "center",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Entra come Coach
        </Link>

        <Link
          href="/athlete-login"
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #333",
            textAlign: "center",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Entra come Atleta
        </Link>
      </div>
    </main>
  );
}


