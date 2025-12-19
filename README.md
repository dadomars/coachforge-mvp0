# CoachForge — MVP-0 (Setup A)

Web app **coach-first** (UI in italiano, unità Kg) per gestione atleti e inviti one-time.

## Tech Lock (Setup A)
- Next.js (App Router) + TypeScript
- Postgres gestito (Neon)
- Prisma + Prisma Migrate
- Auth: NextAuth (Credentials) + RBAC Coach/Athlete
- Hosting: Vercel
- SSOT attivazione atleta: `athlete_auth.activated_at` (derivato “ATTIVO/NON ATTIVO”)

---

## Requisiti locali
- Node.js (LTS)
- pnpm
- Git

Verifica:
- `node -v`
- `pnpm -v`
- `git --version`

---

## Setup locale (DEV)

### 1) Clona e installa
```bash
git clone <repo-url>
cd coachforge-mvp0
pnpm install
```

---

## E3 — Smoke Test PROD (Vercel) [5 minuti]

A) RBAC / Accessi
- Coach loggato: /coach OK (lista atleti visibile)
- Non loggato: /coach bloccato (redirect/login o 401/403 coerente con setup)
- Atleta loggato: /coach bloccato

B) Lista atleti + badge SSOT activated_at
- Atleta appena creato: badge "NON ATTIVO"
- Atleta gia attivato: badge "ATTIVO"
- Refresh hard: badge resta coerente (nessun flip)

C) Inviti one-time (UI + core)
Su atleta NON ATTIVO:
- Click "Crea invito": UI mostra link + bottone "Copia" + "Apri link"
- "Copia": incolla in note -> link identico
- "Apri link": pagina invito non 404
- Genera 2° invito: il precedente risulta invalidato / non utilizzabile
- Accetta invito: atleta diventa ATTIVO (badge aggiornato)
- Prova "Crea invito" su atleta ATTIVO: errore "already activated" (no link nuovo)
- Prova riuso stesso token: fallisce (one-time)

D) API sanity (coach loggato)
- GET /api/coach/athletes: 200, ogni atleta include activatedAt = null oppure stringa ISO
