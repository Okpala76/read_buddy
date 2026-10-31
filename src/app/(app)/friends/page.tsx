import { getMilestoneActivity } from "@/features/streak-buddies/ui/milestone-actions";
import { MilestoneActivity } from "@/features/streak-buddies/ui/MilestoneActivity";
import { getStreakPartnerships } from "@/features/streak-buddies/ui/streak-actions";
import { FriendsPage } from "@/features/friends/ui/FriendsPage";
import { getFriendships } from "@/features/friends/ui/friend-actions";

export default async function ReadingFriendsPage() {
  const [relationships, partnerships, milestones] = await Promise.all([
    getFriendships(),
    getStreakPartnerships(),
    getMilestoneActivity(),
  ]);
  return (
    <div className="space-y-9">
      <FriendsPage relationships={relationships} partnerships={partnerships} />
      <MilestoneActivity activity={{ ...milestones, received: [] }} />
    </div>
  );
}
