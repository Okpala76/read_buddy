import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import {
  findLocalUserByClerkId,
  provisionLocalUser,
} from "@/features/auth/infrastructure/drizzle-user-repository";

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

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
}

export async function requireAuth() {
  await auth.protect();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
