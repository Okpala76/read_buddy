import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { db } from "@/db/client";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

function getRootErrorDetails(error: Error) {
  let current: unknown = error;
  let rootError = error;
  const seen = new Set<unknown>();

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);

    if (current instanceof Error) {
      rootError = current;
      current = current.cause;
    } else if ("err" in current) {
      current = current.err;
    } else {
      break;
    }
  }

  const code =
    "code" in rootError && typeof rootError.code === "string"
      ? rootError.code
      : undefined;

  return {
    name: rootError.name,
    message: rootError.message,
    ...(code ? { code } : {}),
  };
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
    strategy: isBuildTime ? "jwt" : "database",
  },
  secret: process.env.AUTH_SECRET,
  logger: {
    error(error) {
      console.error("[auth][error]", error.name, error.message, {
        rootCause: getRootErrorDetails(error),
      });
    },
  },
  callbacks: {
    async session({ session, token, user }) {
      const userId = user?.id ?? token.sub;

      if (session.user && userId) {
        session.user.id = userId;
      }

      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  trustHost: true,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
