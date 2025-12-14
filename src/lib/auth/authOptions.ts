import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

type Role = "COACH" | "ATHLETE";

// Prisma singleton (evita connessioni duplicate in dev)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;

        if (!email || !password) return null;

        // 1) PROVA COACH
        const coach = await prisma.coach.findUnique({ where: { email } });
        if (coach?.passwordHash) {
          const okCoach = await bcrypt.compare(password, coach.passwordHash);
          if (okCoach) {
            return { id: coach.coachId, email: coach.email, role: "COACH" as const };
          }
          // IMPORTANTISSIMO: se password sbagliata, NON tornare null qui.
          // Devi provare anche ATHLETE (stessa email potrebbe essere atleta).
        }

        // 2) PROVA ATHLETE (SSOT attivazione = athlete_auth.activated_at)
        const athleteAuth = await prisma.athleteAuth.findUnique({
          where: { loginIdentifier: email },
        });

        if (!athleteAuth) return null;
        if (!athleteAuth.activatedAt) return null;
        if (!athleteAuth.passwordHash) return null;

        const okAthlete = await bcrypt.compare(password, athleteAuth.passwordHash);
        if (!okAthlete) return null;

        return {
          id: athleteAuth.athleteId,
          email: athleteAuth.loginIdentifier,
          role: "ATHLETE" as const,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { id: string; role: Role };
        const t = token as typeof token & { role?: Role; uid?: string };
        t.role = u.role;
        t.uid = u.id;
      }
      return token;
    },

    async session({ session, token }) {
      const t = token as typeof token & { role?: Role; uid?: string };
      const s = session as typeof session & { role?: Role; uid?: string };
      s.role = t.role;
      s.uid = t.uid;
      return session;
    },
  },
};