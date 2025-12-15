"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function AthleteLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email: email.trim().toLowerCase(),
      password,
      loginAs: "ATHLETE",
      callbackUrl: "/athlete",
    });

    setLoading(false);

    if (!res) {
      setErrorMsg("Errore inatteso.");
      return;
    }

    if (res.error) {
      if (res.error === "ROLE_MISMATCH") {
        setErrorMsg("❌ Non autorizzato: questo è il login ATLETA. Usa il login COACH.");
        return;
      }
      if (res.error === "ATHLETE_NOT_ACTIVE") {
        setErrorMsg("❌ Atleta non attivo: serve invito/attivazione.");
        return;
      }
      if (res.error === "LOGIN_AS_REQUIRED") {
        setErrorMsg("❌ Errore configurazione login (loginAs mancante).");
        return;
      }
      setErrorMsg("Credenziali non valide.");
      return;
    }

    window.location.href = res.url ?? "/athlete";
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Login Atleta</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>Inserisci email e password dell’atleta.</p>

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


