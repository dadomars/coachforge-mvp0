import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

type Role = "COACH" | "ATHLETE";

// Prisma singleton (evita connessioni duplicate in dev)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

type Creds = {
  email?: string;
  password?: string;
  loginAs?: string; // "COACH" | "ATHLETE"
};

async function isValidCoach(email: string, password: string) {
  const coach = await prisma.coach.findUnique({ where: { email } });
  if (!coach?.passwordHash) return false;
  return bcrypt.compare(password, coach.passwordHash);
}

async function isValidAthlete(email: string, password: string) {
  const athleteAuth = await prisma.athleteAuth.findUnique({
    where: { loginIdentifier: email },
  });
  if (!athleteAuth?.passwordHash) return false;
  if (!athleteAuth.activatedAt) return false;
  return bcrypt.compare(password, athleteAuth.passwordHash);
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        loginAs: { label: "LoginAs", type: "text" }, // 👈 aggiunto
      },

      async authorize(credentials) {
        const c = credentials as unknown as Creds;

        const email = c?.email?.toLowerCase().trim() ?? "";
        const password = c?.password ?? "";
        const loginAs = (c?.loginAs ?? "").toString(); // "COACH" | "ATHLETE"

        if (!email || !password || !loginAs) {
          throw new Error("LOGIN_AS_REQUIRED");
        }

        // ===== LOGIN COACH =====
        if (loginAs === "COACH") {
          const coach = await prisma.coach.findUnique({ where: { email } });

          if (!coach?.passwordHash) {
            // se invece è un atleta valido, è mismatch
            if (await isValidAthlete(email, password)) throw new Error("ROLE_MISMATCH");
            return null;
          }

          const okCoach = await bcrypt.compare(password, coach.passwordHash);
          if (!okCoach) {
            if (await isValidAthlete(email, password)) throw new Error("ROLE_MISMATCH");
            return null;
          }

          return { id: coach.coachId, email: coach.email, role: "COACH" as const };
        }

        // ===== LOGIN ATHLETE =====
        if (loginAs === "ATHLETE") {
          const athleteAuth = await prisma.athleteAuth.findUnique({
            where: { loginIdentifier: email },
          });

          if (!athleteAuth) {
            // se invece è un coach valido, è mismatch
            if (await isValidCoach(email, password)) throw new Error("ROLE_MISMATCH");
            return null;
          }

          // SSOT: attivo solo se activatedAt valorizzato
          if (!athleteAuth.activatedAt) {
            throw new Error("ATHLETE_NOT_ACTIVE");
          }

          if (!athleteAuth.passwordHash) return null;

          const okAthlete = await bcrypt.compare(password, athleteAuth.passwordHash);
          if (!okAthlete) {
            if (await isValidCoach(email, password)) throw new Error("ROLE_MISMATCH");
            return null;
          }

          return {
            id: athleteAuth.athleteId,
            email: athleteAuth.loginIdentifier,
            role: "ATHLETE" as const,
          };
        }

        throw new Error("LOGIN_AS_REQUIRED");
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