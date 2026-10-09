import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import {
  findLocalUserByClerkId,
  provisionLocalUser,
} from "@/features/auth/infrastructure/drizzle-user-repository";

const resolveLocalUser = cache(async function resolveLocalUser(userId: string) {
  const existingUser = await findLocalUserByClerkId(userId);
  if (existingUser) {
    return existingUser;
  }

  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.primaryEmailAddress;

  if (
    !clerkUser ||
    !primaryEmail ||
    primaryEmail.verification?.status !== "verified"
  ) {
    throw new Error("A verified primary email is required");
  }

  const name =
    clerkUser.fullName ??
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");

  return provisionLocalUser({
    clerkUserId: userId,
    email: primaryEmail.emailAddress.trim().toLowerCase(),
    name: name || null,
    image: clerkUser.imageUrl,
  });
});

export const getCurrentUser = cache(async function getCurrentUser() {
  const { userId } = await auth();
  return userId ? resolveLocalUser(userId) : null;
});

export const requireAuth = cache(async function requireAuth() {
  const { userId } = await auth.protect();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await resolveLocalUser(userId);

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
});
