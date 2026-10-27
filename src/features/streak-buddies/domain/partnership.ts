export type PartnershipStatus = "PENDING" | "ACTIVE" | "PAUSED" | "DECLINED" | "ENDED";
export type PartnerDecision = "ACTIVE" | "DECLINED";

export function canReplyToStreakInvite(
  request: { status: PartnershipStatus; invitedByUserId: string },
  userId: string,
) {
  return request.status === "PENDING" && request.invitedByUserId !== userId;
}

export function mayChangeStreakPartnership(
  relationship: { status: PartnershipStatus; pausedByUserId: string | null },
  actorId: string,
  action: "PAUSE" | "RESUME" | "END",
) {
  if (action === "PAUSE") return relationship.status === "ACTIVE";
  if (action === "RESUME")
    return relationship.status === "PAUSED" && relationship.pausedByUserId === actorId;
  return relationship.status === "ACTIVE" || relationship.status === "PAUSED";
}
