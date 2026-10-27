/** Canonical unordered pair prevents reverse requests creating duplicate friendships. */
export function friendshipPair(first: string, second: string) {
  if (first === second)
    throw new Error("You cannot send yourself a friend request");
  return first < second
    ? { userLowId: first, userHighId: second }
    : { userLowId: second, userHighId: first };
}
export type FriendshipStatus = "PENDING" | "ACCEPTED" | "DECLINED";
export function canRespondToFriendRequest(
  friendship: {
    status: FriendshipStatus;
    invitedByUserId: string;
    userLowId: string;
    userHighId: string;
  },
  userId: string,
): boolean {
  return (
    friendship.status === "PENDING" &&
    (friendship.userLowId === userId || friendship.userHighId === userId) &&
    friendship.invitedByUserId !== userId
  );
}
