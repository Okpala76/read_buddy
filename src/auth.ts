import NextAuth, {
  type Session,
  type SessionStrategy,
  type User,
} from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { db } from "@/db/client";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

declare module "next-auth" {
  interface Session {
    user: ExtendedUser;
  }
}

const isBuildTime = process.env.DATABASE_URL?.includes("dummy") === true;

const authConfig = {
  adapter:
    isBuildTime || !db
      ? undefined
      : DrizzleAdapter(db, {
          usersTable: users,
          accountsTable: accounts,
          sessionsTable: sessions,
          verificationTokensTable: verificationTokens,
        }),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
    }),
  ],
  session: {
    strategy: (isBuildTime ? "jwt" : "database") as SessionStrategy,
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async session(params: { session: Session; user: User & { id: string } }) {
      const { session, user } = params;
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
