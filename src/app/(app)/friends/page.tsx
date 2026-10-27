import { FriendsPage } from "@/features/friends/ui/FriendsPage";
import { getFriendships } from "@/features/friends/ui/friend-actions";

export default async function ReadingFriendsPage() {
  const relationships = await getFriendships();
  return <FriendsPage relationships={relationships} />;
}
