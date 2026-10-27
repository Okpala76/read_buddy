import { getStreakPartnerships } from "@/features/streak-buddies/ui/streak-actions";
import { FriendsPage } from "@/features/friends/ui/FriendsPage";
import { getFriendships } from "@/features/friends/ui/friend-actions";

export default async function ReadingFriendsPage() {
  const [relationships, partnerships] = await Promise.all([getFriendships(), getStreakPartnerships()]);
  return <FriendsPage relationships={relationships} partnerships={partnerships} />;
}
