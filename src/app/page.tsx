export default function HomePage() {
  return (
    <main style={{ maxWidth: 520, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontSize: 34, marginBottom: 10 }}>CoachForge MVP-0</h1>
      <p style={{ marginBottom: 20, opacity: 0.8 }}>
        Scegli l’area di accesso.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        <a
          href="/coach-login"
          style={{
            display: "block",
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid #333",
            textAlign: "center",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Area Coach → Login
        </a>

        <a
          href="/athlete-login"
          style={{
            display: "block",
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid #333",
            textAlign: "center",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Area Atleta → Login
        </a>
      </div>
    </main>
  );
}
