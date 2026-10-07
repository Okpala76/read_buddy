export enum ReminderDeliveryStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SENT = "SENT",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

export type DeliveryStatusValue =
  "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "SKIPPED";

export type ReminderDeliveryChannel = "EMAIL" | "PUSH";

export type ReminderNotificationKind = "DAILY_REMINDER" | "STREAK_RESCUE";

export type ReminderSkipReasonValue =
  | "REMINDERS_DISABLED"
  | "ALREADY_READ_TODAY"
  | "NO_ACTIVE_BOOK"
  | "NO_ENABLED_CHANNEL"
  | "QUIET_HOURS"
  | "STREAK_BROKEN";

export type AdaptiveTimeSource =
  | "MANUAL"
  | "INSUFFICIENT_HISTORY"
  | "OVERALL_ADAPTIVE"
  | "WEEKDAY_ADAPTIVE"
  | "WEEKEND_ADAPTIVE";

export interface ReadingSessionDate {
  readAt: Date;
}

export interface ReminderStreakService {
  getStreak(
    userId: string,
    now: Date,
  ): Promise<{
    count: number;
    status: "ACTIVE" | "AT_RISK" | "BROKEN";
  }>;
}

export interface ReminderStreakRepository {
  findRecentReadingDates(
    userId: string,
    limit: number,
  ): Promise<Array<{ readAt: Date }>>;
}

export interface ReminderPreferenceProps {
  userId: string;
  enabled: boolean;
  emailEnabled: boolean;
  reminderTime: string;
  streakRescueEnabled: boolean;
  streakRescueTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  adaptiveTimingEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ReminderPreference {
  private readonly props: ReminderPreferenceProps;

  private constructor(props: ReminderPreferenceProps) {
    this.props = props;
  }

  static create(props: {
    userId: string;
    enabled: boolean;
    emailEnabled?: boolean;
    reminderTime: string;
    streakRescueEnabled?: boolean;
    streakRescueTime?: string;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    adaptiveTimingEnabled?: boolean;
  }): ReminderPreference {
    if (!/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(props.reminderTime)) {
      throw new Error("Reminder time must be in HH:MM:SS format");
    }
    if (
      props.streakRescueTime &&
      !/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(props.streakRescueTime)
    ) {
      throw new Error("Streak rescue time must be in HH:MM:SS format");
    }
    if (
      props.quietHoursStart &&
      !/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(props.quietHoursStart)
    ) {
      throw new Error("Quiet hours start must be in HH:MM:SS format");
    }
    if (
      props.quietHoursEnd &&
      !/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(props.quietHoursEnd)
    ) {
      throw new Error("Quiet hours end must be in HH:MM:SS format");
    }

    return new ReminderPreference({
      ...props,
      emailEnabled: props.emailEnabled ?? true,
      streakRescueEnabled: props.streakRescueEnabled ?? true,
      streakRescueTime: props.streakRescueTime ?? "21:30:00",
      quietHoursStart: props.quietHoursStart ?? "22:30:00",
      quietHoursEnd: props.quietHoursEnd ?? "07:00:00",
      adaptiveTimingEnabled: props.adaptiveTimingEnabled ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: ReminderPreferenceProps): ReminderPreference {
    return new ReminderPreference(props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get enabled(): boolean {
    return this.props.enabled;
  }

  get reminderTime(): string {
    return this.props.reminderTime;
  }

  get emailEnabled(): boolean {
    return this.props.emailEnabled;
  }

  get streakRescueEnabled(): boolean {
    return this.props.streakRescueEnabled;
  }

  get streakRescueTime(): string {
    return this.props.streakRescueTime;
  }

  get quietHoursStart(): string {
    return this.props.quietHoursStart;
  }

  get quietHoursEnd(): string {
    return this.props.quietHoursEnd;
  }

  get adaptiveTimingEnabled(): boolean {
    return this.props.adaptiveTimingEnabled;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  enable(): ReminderPreference {
    return new ReminderPreference({
      ...this.props,
      enabled: true,
      updatedAt: new Date(),
    });
  }

  disable(): ReminderPreference {
    return new ReminderPreference({
      ...this.props,
      enabled: false,
      updatedAt: new Date(),
    });
  }

  updateTime(reminderTime: string): ReminderPreference {
    if (!/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(reminderTime)) {
      throw new Error("Reminder time must be in HH:MM:SS format");
    }
    return new ReminderPreference({
      ...this.props,
      reminderTime,
      updatedAt: new Date(),
    });
  }

  updateEmailEnabled(emailEnabled: boolean): ReminderPreference {
    return new ReminderPreference({
      ...this.props,
      emailEnabled,
      updatedAt: new Date(),
    });
  }

  updateStreakRescueEnabled(streakRescueEnabled: boolean): ReminderPreference {
    return new ReminderPreference({
      ...this.props,
      streakRescueEnabled,
      updatedAt: new Date(),
    });
  }

  updateStreakRescueTime(streakRescueTime: string): ReminderPreference {
    if (!/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(streakRescueTime)) {
      throw new Error("Streak rescue time must be in HH:MM:SS format");
    }
    return new ReminderPreference({
      ...this.props,
      streakRescueTime,
      updatedAt: new Date(),
    });
  }

  updateQuietHours(
    quietHoursStart: string,
    quietHoursEnd: string,
  ): ReminderPreference {
    if (!/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(quietHoursStart)) {
      throw new Error("Quiet hours start must be in HH:MM:SS format");
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(quietHoursEnd)) {
      throw new Error("Quiet hours end must be in HH:MM:SS format");
    }
    return new ReminderPreference({
      ...this.props,
      quietHoursStart,
      quietHoursEnd,
      updatedAt: new Date(),
    });
  }

  updateAdaptiveTimingEnabled(
    adaptiveTimingEnabled: boolean,
  ): ReminderPreference {
    return new ReminderPreference({
      ...this.props,
      adaptiveTimingEnabled,
      updatedAt: new Date(),
    });
  }

  toPersistence(): ReminderPreferenceProps {
    return { ...this.props };
  }
}

export interface ReminderDeliveryProps {
  id: string;
  userId: string;
  recipientEmail: string;
  bookTitle: string | null;
  bookCurrentPage: number | null;
  bookTotalPages: number | null;
  dailyPageTarget: number;
  status: DeliveryStatusValue;
  deliveryChannel: ReminderDeliveryChannel | null;
  notificationKind: ReminderNotificationKind;
  scheduledFor: Date;
  lockedAt: Date | null;
  nextAttemptAt: Date | null;
  sentAt: Date | null;
  attemptCount: number;
  providerMessageId: string | null;
  errorCode: string | null;
  skipReason: ReminderSkipReasonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ReminderDelivery {
  private readonly props: ReminderDeliveryProps;

  private constructor(props: ReminderDeliveryProps) {
    this.props = props;
  }

  static create(props: {
    id: string;
    userId: string;
    recipientEmail: string;
    bookTitle: string | null;
    bookCurrentPage: number | null;
    bookTotalPages: number | null;
    dailyPageTarget: number;
    scheduledFor: Date;
    notificationKind?: ReminderNotificationKind;
  }): ReminderDelivery {
    return new ReminderDelivery({
      ...props,
      status: "PENDING",
      deliveryChannel: null,
      notificationKind: props.notificationKind ?? "DAILY_REMINDER",
      lockedAt: null,
      nextAttemptAt: null,
      sentAt: null,
      attemptCount: 0,
      providerMessageId: null,
      errorCode: null,
      skipReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: ReminderDeliveryProps): ReminderDelivery {
    return new ReminderDelivery(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get recipientEmail(): string {
    return this.props.recipientEmail;
  }

  get bookTitle(): string | null {
    return this.props.bookTitle;
  }

  get bookCurrentPage(): number | null {
    return this.props.bookCurrentPage;
  }

  get bookTotalPages(): number | null {
    return this.props.bookTotalPages;
  }

  get dailyPageTarget(): number {
    return this.props.dailyPageTarget;
  }

  get status(): DeliveryStatusValue {
    return this.props.status;
  }

  get scheduledFor(): Date {
    return this.props.scheduledFor;
  }

  get deliveryChannel(): ReminderDeliveryChannel | null {
    return this.props.deliveryChannel;
  }

  get notificationKind(): ReminderNotificationKind {
    return this.props.notificationKind;
  }

  get lockedAt(): Date | null {
    return this.props.lockedAt;
  }

  get nextAttemptAt(): Date | null {
    return this.props.nextAttemptAt;
  }

  get sentAt(): Date | null {
    return this.props.sentAt;
  }

  get attemptCount(): number {
    return this.props.attemptCount;
  }

  get providerMessageId(): string | null {
    return this.props.providerMessageId;
  }

  get errorCode(): string | null {
    return this.props.errorCode;
  }

  get skipReason(): ReminderSkipReasonValue | null {
    return this.props.skipReason;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  markProcessing(lockedAt: Date): ReminderDelivery {
    if (this.props.status !== "PENDING" && this.props.status !== "FAILED") {
      throw new Error(
        `Cannot claim reminder delivery from ${this.props.status}`,
      );
    }
    if (Number.isNaN(lockedAt.getTime())) {
      throw new Error("Claim time must be a valid date");
    }
    if (
      this.props.status === "FAILED" &&
      (!this.props.nextAttemptAt || this.props.nextAttemptAt > lockedAt)
    ) {
      throw new Error("Cannot claim reminder delivery before its retry is due");
    }

    return new ReminderDelivery({
      ...this.props,
      status: "PROCESSING",
      lockedAt,
      updatedAt: new Date(),
    });
  }

  selectChannel(channel: ReminderDeliveryChannel): ReminderDelivery {
    this.assertStatus("PROCESSING", "select a delivery channel");
    if (this.props.deliveryChannel) {
      throw new Error("Reminder delivery channel is already selected");
    }
    return new ReminderDelivery({
      ...this.props,
      deliveryChannel: channel,
      updatedAt: new Date(),
    });
  }

  fallbackToEmail(): ReminderDelivery {
    this.assertStatus("PROCESSING", "fall back to email");
    if (this.props.deliveryChannel !== "PUSH") {
      throw new Error("Only a push delivery can fall back to email");
    }
    return new ReminderDelivery({
      ...this.props,
      deliveryChannel: "EMAIL",
      updatedAt: new Date(),
    });
  }

  markSent(
    providerMessageId: string,
    sentAt: Date = new Date(),
  ): ReminderDelivery {
    this.assertStatus("PROCESSING", "mark as sent");
    return new ReminderDelivery({
      ...this.props,
      status: "SENT",
      lockedAt: null,
      nextAttemptAt: null,
      sentAt,
      attemptCount: this.props.attemptCount + 1,
      providerMessageId,
      errorCode: null,
      skipReason: null,
      updatedAt: sentAt,
    });
  }

  markFailed(
    errorCode: string,
    nextAttemptAt: Date | null,
    failedAt: Date = new Date(),
  ): ReminderDelivery {
    this.assertStatus("PROCESSING", "mark as failed");
    return new ReminderDelivery({
      ...this.props,
      status: "FAILED",
      lockedAt: null,
      nextAttemptAt,
      attemptCount: this.props.attemptCount + 1,
      providerMessageId: null,
      errorCode,
      skipReason: null,
      updatedAt: failedAt,
    });
  }

  markSkipped(
    skipReason: ReminderSkipReasonValue,
    skippedAt: Date = new Date(),
  ): ReminderDelivery {
    this.assertStatus("PROCESSING", "mark as skipped");
    return new ReminderDelivery({
      ...this.props,
      status: "SKIPPED",
      lockedAt: null,
      nextAttemptAt: null,
      errorCode: null,
      skipReason,
      updatedAt: skippedAt,
    });
  }

  recoverClaim(recoveredAt: Date = new Date()): ReminderDelivery {
    this.assertStatus("PROCESSING", "recover");
    return new ReminderDelivery({
      ...this.props,
      status: this.props.attemptCount === 0 ? "PENDING" : "FAILED",
      lockedAt: null,
      updatedAt: recoveredAt,
    });
  }

  toPersistence(): ReminderDeliveryProps {
    return { ...this.props };
  }

  private assertStatus(expected: DeliveryStatusValue, action: string): void {
    if (this.props.status !== expected) {
      throw new Error(
        `Cannot ${action} reminder delivery from ${this.props.status}`,
      );
    }
  }
}

export interface ReminderPreferenceRepository {
  findByUserId(userId: string): Promise<ReminderPreference | null>;
  findTimezoneByUserId(userId: string): Promise<string>;
  saveSettings(preference: ReminderPreference, timezone: string): Promise<void>;
}

export interface ReminderSchedulingCandidate {
  userId: string;
  recipientEmail: string;
  bookTitle: string | null;
  bookCurrentPage: number | null;
  bookTotalPages: number | null;
  dailyPageTarget: number;
  reminderTime: string;
  timezone: string;
  enabled: boolean;
  streakRescueEnabled: boolean;
  streakRescueTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  adaptiveTimingEnabled: boolean;
}

export interface ReminderSchedulingRepository {
  findEnabledCandidates(): Promise<ReminderSchedulingCandidate[]>;
  createDeliveryIfAbsent(delivery: ReminderDelivery): Promise<boolean>;
}

export interface ReminderDeliveryRepository {
  findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<ReminderDelivery[]>;
  findByUserIdAndStatus(
    userId: string,
    status: DeliveryStatusValue,
    limit?: number,
    offset?: number,
  ): Promise<ReminderDelivery[]>;
}

export interface ReminderDispatchEligibility {
  timezone: string;
  remindersEnabled: boolean;
  emailEnabled: boolean;
  hasActiveBook: boolean;
  streakRescueEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface ReminderDispatchRepository {
  recoverStaleClaims(staleBefore: Date, recoveredAt: Date): Promise<number>;
  claimDueDeliveries(
    now: Date,
    limit: number,
    maxAttempts: number,
  ): Promise<ReminderDelivery[]>;
  findEligibility(userId: string): Promise<ReminderDispatchEligibility>;
  hasReadingSessionBetween(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<boolean>;
  selectChannel(
    deliveryId: string,
    claimedAt: Date,
    channel: ReminderDeliveryChannel,
    selectedAt: Date,
  ): Promise<boolean>;
  fallbackToEmail(
    deliveryId: string,
    claimedAt: Date,
    selectedAt: Date,
  ): Promise<boolean>;
  saveClaimResult(
    delivery: ReminderDelivery,
    claimedAt: Date,
  ): Promise<boolean>;
}

export interface ReminderStreakRepository {
  findRecentReadingDates(
    userId: string,
    limit: number,
  ): Promise<Array<{ readAt: Date }>>;
}

export interface ReminderStreakService {
  getStreak(
    userId: string,
    now: Date,
  ): Promise<{
    count: number;
    status: "ACTIVE" | "AT_RISK" | "BROKEN";
  }>;
}

export interface ReadingBehaviorProfileRepository {
  findByUserId(userId: string): Promise<ReadingBehaviorProfile | null>;
  upsert(profile: ReadingBehaviorProfile): Promise<void>;
  findRecentReadingDates(
    userId: string,
    limit: number,
  ): Promise<Array<ReadingSessionDate>>;
  getUserTimezone(userId: string): Promise<string>;
}

export interface ReadingBehaviorProfile {
  userId: string;
  sampleDays: number;
  typicalReadingMinute: number;
  weekdaySampleDays: number;
  weekdayTypicalMinute: number | null;
  weekendSampleDays: number;
  weekendTypicalMinute: number | null;
  windowStart: Date;
  computedAt: Date;
}

export interface ReadingSessionDate {
  readAt: Date;
}

export interface EffectiveReminderTimeResult {
  time: string;
  source: AdaptiveTimeSource;
  sampleDays: number;
}

export interface GetEffectiveReminderTimeUseCase {
  execute(userId: string, now: Date): Promise<EffectiveReminderTimeResult>;
}
