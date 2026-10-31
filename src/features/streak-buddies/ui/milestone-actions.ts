"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import {
  congratulateFriendMilestone,
  readFriendMilestones,
  readReceivedCongratulations,
} from "../infrastructure/milestone-repository";

export async function getMilestoneActivity() {
  const user = await requireAuth();
  const [friends, received] = await Promise.all([
    readFriendMilestones(user.id),
    readReceivedCongratulations(user.id),
  ]);
  return { friends, received };
}

export async function congratulateMilestone(input: unknown) {
  const user = await requireAuth();
  const { milestoneId } = z
    .object({ milestoneId: z.string().uuid() })
    .parse(input);
  await congratulateFriendMilestone(user.id, milestoneId);
  revalidatePath("/friends");
}
