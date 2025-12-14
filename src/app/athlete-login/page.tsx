"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function AthleteLoginPage() {
  const searchParams = useSearchParams();
  const activated = useMemo(() => searchParams.get("activated") === "1", [searchParams]);

  // ✅ Niente useEffect -> niente warning React Compiler
  const [showActivatedBanner, setShowActivatedBanner] = useState<boolean>(() => activated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    // appena tenti login, nascondiamo il banner (non serve più)
    setShowActivatedBanner(false);

    const res = await signIn("credentials", {
      redirect: false,
      email: email.trim().toLowerCase(),
      password,
      callbackUrl: "/athlete",
    });

    setLoading(false);

    if (!res) {
      setErrorMsg("Errore inatteso.");
      return;
    }

    if (res.error) {
      setErrorMsg("Credenziali non valide o atleta non attivo.");
      return;
    }

    window.location.href = res.url ?? "/athlete";
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Login Atleta</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Inserisci email e password dell’atleta.
      </p>

      {showActivatedBanner && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #b7e4c7",
            background: "#ecfdf5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>✅ Attivazione completata. Ora accedi.</span>
          <button
            type="button"
            onClick={() => setShowActivatedBanner(false)}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid #333",
              cursor: "pointer",
              background: "transparent",
              fontWeight: 600,
            }}
          >
            OK
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} style={{ marginTop: 20, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="es. mario.rossi@test.it"
            autoComplete="email"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </label>

        {errorMsg && (
          <div style={{ padding: 10, borderRadius: 10, border: "1px solid #f5b5b5" }}>
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {loading ? "Accesso..." : "Entra"}
        </button>
      </form>
    </main>
  );
}
