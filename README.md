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