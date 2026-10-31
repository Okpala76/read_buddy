import { getReceivedStreakNudges } from "@/features/streak-buddies/ui/nudge-actions";
import { getStreakPartnerships } from "@/features/streak-buddies/ui/streak-actions";
import { FriendsPage } from "@/features/friends/ui/FriendsPage";
import { getFriendships } from "@/features/friends/ui/friend-actions";

export default async function ReadingFriendsPage() {
  const [relationships, partnerships, nudges] = await Promise.all([
    getFriendships(),
    getStreakPartnerships(),
    getReceivedStreakNudges(),
  ]);
  return (
    <FriendsPage
      relationships={relationships}
      partnerships={partnerships}
      nudges={nudges.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
