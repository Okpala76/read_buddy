import type {
  ReminderDeliveryChannel,
  ReminderSkipReasonValue,
  ReminderNotificationKind,
} from "./reminder";

export type NotificationDecision =
  | {
      action: "PUSH";
      reason: "PUSH_SELECTED";
    }
  | {
      action: "EMAIL";
      reason: "EMAIL_SELECTED" | "PUSH_UNAVAILABLE_EMAIL_FALLBACK";
    }
  | {
      action: "SKIP";
      reason: ReminderSkipReasonValue;
    };

export interface NotificationDecisionInput {
  remindersEnabled: boolean;
  emailEnabled: boolean;
  alreadyReadToday: boolean;
  hasActiveBook: boolean;
  pushAvailable: boolean;
  selectedChannel: ReminderDeliveryChannel | null;
  notificationKind: ReminderNotificationKind;
  streakRescueEnabled: boolean;
  streakStatus: "ACTIVE" | "AT_RISK" | "BROKEN";
  inQuietHours: boolean;
}

export class NotificationDecisionEngine {
  decide(input: NotificationDecisionInput): NotificationDecision {
    if (!input.remindersEnabled) {
      return { action: "SKIP", reason: "REMINDERS_DISABLED" };
    }

    // For STREAK_RESCUE, check streak-specific eligibility
    if (input.notificationKind === "STREAK_RESCUE") {
      if (!input.streakRescueEnabled) {
        return { action: "SKIP", reason: "REMINDERS_DISABLED" };
      }
      if (input.streakStatus !== "AT_RISK") {
        return {
          action: "SKIP",
          reason:
            input.streakStatus === "ACTIVE"
              ? "ALREADY_READ_TODAY"
              : "STREAK_BROKEN",
        };
      }
      if (input.inQuietHours) {
        return { action: "SKIP", reason: "QUIET_HOURS" };
      }
      // For STREAK_RESCUE, the "already read today" check is implicitly covered by streakStatus !== AT_RISK
    } else {
      // DAILY_REMINDER checks
      if (input.alreadyReadToday) {
        return { action: "SKIP", reason: "ALREADY_READ_TODAY" };
      }
      if (!input.hasActiveBook) {
        return { action: "SKIP", reason: "NO_ACTIVE_BOOK" };
      }
    }

    if (input.selectedChannel === "PUSH") {
      return { action: "PUSH", reason: "PUSH_SELECTED" };
    }
    if (input.selectedChannel === "EMAIL") {
      return { action: "EMAIL", reason: "EMAIL_SELECTED" };
    }
    if (input.pushAvailable) {
      return { action: "PUSH", reason: "PUSH_SELECTED" };
    }
    if (input.emailEnabled) {
      return {
        action: "EMAIL",
        reason: "PUSH_UNAVAILABLE_EMAIL_FALLBACK",
      };
    }
    return { action: "SKIP", reason: "NO_ENABLED_CHANNEL" };
  }
}
