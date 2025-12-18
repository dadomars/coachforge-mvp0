# AGENTS.md — CoachForge MVP-0 (TECH LOCK Setup A)

You are Codex working inside this repository.
Goal: make minimal, safe changes aligned to the current task only.

## Stack (DO NOT CHANGE)
- Next.js (App Router) + TypeScript
- Postgres (Neon) + Prisma
- Auth.js / NextAuth (Credentials) with roles: COACH | ATHLETE
- SSOT athlete activation: athlete_auth.activated_at (NULL = not active, NOT NULL = active)

## Hard guardrails
- NO new features outside the specific task.
- NO refactor “for cleanliness” unless explicitly requested.
- NO storing invite token_raw in DB (ONLY token_hash = sha256(token_raw + INVITE_TOKEN_PEPPER)).
- notes_private must never leak in public/athlete-facing responses.
- Keep diffs small and reviewable.

## Commands
- Install: pnpm install
- Dev: pnpm dev
- Build: pnpm build
- Lint: pnpm lint
- Prisma generate: pnpm prisma generate
- Prisma migrate (dev): pnpm prisma migrate dev
- Prisma Studio: pnpm prisma studio
- Seed (if configured): pnpm prisma db seed

## Repo conventions
- API routes: src/app/api/**/route.ts
- Pages: src/app/**/page.tsx
- Prefer explicit types / narrowing over `any`.
  - If you must cast, use `unknown` + safe checks, keep scope tiny.

## Workflow rules (anti-casino)
For every task:
1) Dedicated branch.
2) Smallest change that satisfies the DoD.
3) Clear diff summary + files touched.
4) Run verification requested by the task and report results.
5) Stop. Do not continue to next tasks.