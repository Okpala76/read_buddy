import { getMilestoneActivity } from "@/features/streak-buddies/ui/milestone-actions";
import { MilestoneActivity } from "@/features/streak-buddies/ui/MilestoneActivity";
import { getReceivedStreakNudges } from "@/features/streak-buddies/ui/nudge-actions";
import { getStreakPartnerships } from "@/features/streak-buddies/ui/streak-actions";
import { FriendsPage } from "@/features/friends/ui/FriendsPage";
import { getFriendships } from "@/features/friends/ui/friend-actions";

export default async function ReadingFriendsPage() {
  const [relationships, partnerships, nudges, milestones] = await Promise.all([
    getFriendships(),
    getStreakPartnerships(),
    getReceivedStreakNudges(),
    getMilestoneActivity(),
  ]);
  return (
    <div className="space-y-9">
      <FriendsPage
        relationships={relationships}
        partnerships={partnerships}
        nudges={nudges.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
      <MilestoneActivity activity={milestones} />
    </div>
  );
}
