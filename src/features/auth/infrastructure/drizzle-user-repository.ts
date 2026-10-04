import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { users } from "@/db/schema";

export interface LocalUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface ProvisionLocalUserInput {
  clerkUserId: string;
  email: string;
  name: string | null;
  image: string | null;
}

const localUserColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  image: users.image,
};

function getDatabase() {
  if (!db) {
    throw new Error("Database is unavailable");
  }

  return db;
}

export async function findLocalUserByClerkId(
  clerkUserId: string,
): Promise<LocalUser | null> {
  const database = getDatabase();
  const [user] = await database
    .select(localUserColumns)
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  return user ?? null;
}

export async function provisionLocalUser(
  input: ProvisionLocalUserInput,
): Promise<LocalUser> {
  const database = getDatabase();
  const [existingEmailUser] = await database
    .select({ ...localUserColumns, clerkUserId: users.clerkUserId })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingEmailUser?.clerkUserId) {
    if (existingEmailUser.clerkUserId !== input.clerkUserId) {
      throw new Error("Email is already linked to another Clerk account");
    }

    return existingEmailUser;
  }

  if (existingEmailUser) {
    const [linkedUser] = await database
      .update(users)
      .set({
        clerkUserId: input.clerkUserId,
        emailVerified: new Date(),
        name: input.name,
        image: input.image,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, existingEmailUser.id), isNull(users.clerkUserId)))
      .returning(localUserColumns);

    if (linkedUser) {
      return linkedUser;
    }
  } else {
    const [createdUser] = await database
      .insert(users)
      .values({
        clerkUserId: input.clerkUserId,
        email: input.email,
        emailVerified: new Date(),
        name: input.name,
        image: input.image,
      })
      .onConflictDoNothing()
      .returning(localUserColumns);

    if (createdUser) {
      return createdUser;
    }
  }

  const user = await findLocalUserByClerkId(input.clerkUserId);
  if (!user) {
    throw new Error("Unable to provision the local user");
  }

  return user;
}
