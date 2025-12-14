"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function AthleteLoginClient() {
  const sp = useSearchParams();
  const activated = sp.get("activated") === "1";

  const [bannerClosed, setBannerClosed] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

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

  const showActivatedBanner = activated && !bannerClosed;

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Login Atleta</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Inserisci email e password dell’atleta.
      </p>

      {showActivatedBanner && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #cfe9d2",
            background: "#f2fbf3",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>✅ Account attivato. Ora puoi fare login.</div>
          <button
            onClick={() => setBannerClosed(true)}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid #333",
              cursor: "pointer",
              background: "transparent",
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