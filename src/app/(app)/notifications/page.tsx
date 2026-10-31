import { NotificationCenter } from "@/features/social-notifications/ui/NotificationCenter";
import { getNotificationCenter } from "@/features/social-notifications/ui/notification-actions";
import { getFriendships } from "@/features/friends/ui/friend-actions";
import { getStreakPartnerships } from "@/features/streak-buddies/ui/streak-actions";
export default async function NotificationsPage() {
  const [center, friends, partnerships] = await Promise.all([
    getNotificationCenter(),
    getFriendships(),
    getStreakPartnerships(),
  ]);
  const invitations = [...friends, ...partnerships].filter(
    (r) => r.status === "PENDING" && r.direction === "incoming",
  ).length;
  return (
    <NotificationCenter
      key={JSON.stringify(center)}
      {...center}
      invitations={invitations}
    />
  );
}
