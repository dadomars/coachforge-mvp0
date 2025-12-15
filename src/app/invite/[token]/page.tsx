"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Params = Record<string, string | string[] | undefined>;

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "error" in data) {
    const maybe = (data as { error?: unknown }).error;
    if (typeof maybe === "string" && maybe.trim().length > 0) return maybe;
  }
  return fallback;
}

export default function InviteActivatePage() {
  const router = useRouter();
  const params = useParams();

  const token = useMemo(() => {
    const t = (params as Params)?.token;
    if (Array.isArray(t)) return t[0] ?? "";
    return typeof t === "string" ? t : "";
  }, [params]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ anti-autofill: quando la pagina monta, svuotiamo i campi
  useEffect(() => {
    setEmail("");
    setPassword("");
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const r = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data: unknown = await r.json().catch(() => ({}));

      if (!r.ok) {
        setMsg(getErrorMessage(data, `Errore ${r.status}`));
        return;
      }

      setMsg("✅ Account attivato. Vai al login atleta…");
      // piccolo delay per far vedere il messaggio (UX)
      setTimeout(() => router.push("/athlete-login?activated=1"), 700);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    !!token && email.trim().length > 3 && password.trim().length >= 4 && !loading;

  return (
    <main style={{ maxWidth: 520, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontSize: 34, marginBottom: 10 }}>Attiva account atleta</h1>
      <p style={{ marginBottom: 20 }}>
        Inserisci email e password per attivare l’account (invito one-time).
      </p>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
        Invito: <code>{token ? "presente" : "mancante"}</code>
      </div>

      <form
        onSubmit={onSubmit}
        style={{ display: "grid", gap: 14 }}
        autoComplete="off"
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            name="athlete_email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="es. mario.rossi@test.it"
            autoComplete="off"
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #ccc",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            name="athlete_new_password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="es. Test1234!"
            // ✅ questo aiuta molto contro autofill credenziali esistenti
            autoComplete="new-password"
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #ccc",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #333",
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontWeight: 800,
          }}
        >
          {loading ? "Attivo..." : "Attiva account"}
        </button>

        {msg && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#f7f7f7",
            }}
          >
            {msg}
          </div>
        )}
      </form>
    </main>
  );
}