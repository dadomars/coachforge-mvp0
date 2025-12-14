import "next-auth";
import "next-auth/jwt";

type AppRole = "COACH" | "ATHLETE";

declare module "next-auth" {
  interface User {
    role?: AppRole;
  }

  interface Session {
    role?: AppRole;
    uid?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    uid?: string;
  }
}
export {};