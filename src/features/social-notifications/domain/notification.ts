export const reactions = ["❤️", "👏", "🙌"] as const;
export type Reaction = (typeof reactions)[number];
export type NotificationKind =
  "NUDGE" | "CONGRATULATION" | "NUDGE_REACTION" | "CONGRATULATION_REACTION";
export type NotificationView = {
  id: string;
  kind: NotificationKind;
  name: string | null;
  days: number | null;
  createdAt: string;
  read: boolean;
  reaction: Reaction | null;
};
export function notificationMessage(item: NotificationView): string {
  const name = item.name?.trim() || "Your reading friend";
  if (item.kind.endsWith("_REACTION"))
    return `${name} reacted ${item.reaction} to your encouragement.`;
  return item.kind === "NUDGE"
    ? `${name} is cheering you on. A little reading today keeps your streak alive!`
    : `${name} says: Congratulations on ${item.days} consecutive reading days. Keep going!`;
}
