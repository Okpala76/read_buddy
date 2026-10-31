import type { NotificationView } from "./notification";
export const panelKinds = [
  "NUDGE",
  "CONGRATULATION",
  "NUDGE_REACTION",
  "CONGRATULATION_REACTION",
  "FRIEND_INVITE",
  "STREAK_INVITE",
  "MILESTONE",
  "READING_REMINDER",
] as const;
export type PanelKind = (typeof panelKinds)[number];
export type PanelItem = Omit<NotificationView, "kind"> & { kind: PanelKind };
export type PanelData = {
  items: PanelItem[];
  unreadCount: number;
  hasMore: boolean;
};
export function panelMessage(item: PanelItem) {
  const name = item.name?.trim() || "Your reading friend";
  switch (item.kind) {
    case "FRIEND_INVITE":
      return `${name} sent you a friend request.`;
    case "STREAK_INVITE":
      return `${name} invited you to be streak buddies.`;
    case "MILESTONE":
      return `${name} reached a ${item.days}-day reading streak. Congratulate them!`;
    case "READING_REMINDER":
      return "It’s your reading time. Take a moment with your current book.";
    case "NUDGE":
      return `${name} is cheering you on. A little reading today keeps your streak alive!`;
    case "CONGRATULATION":
      return `${name} says: Congratulations on ${item.days} consecutive reading days. Keep going!`;
    default:
      return `${name} reacted ${item.reaction} to your encouragement.`;
  }
}
export function panelDestination(kind: PanelKind) {
  return kind === "READING_REMINDER"
    ? "/sessions"
    : ["FRIEND_INVITE", "STREAK_INVITE", "MILESTONE"].includes(kind)
      ? "/friends"
      : null;
}
