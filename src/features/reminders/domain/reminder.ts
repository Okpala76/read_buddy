export enum ReminderDeliveryStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SENT = "SENT",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

export type DeliveryStatusValue =
  "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "SKIPPED";

export type ReminderSkipReasonValue =
  | "REMINDERS_DISABLED"
  | "ALREADY_READ_TODAY"
  | "NO_ACTIVE_BOOK"
  | "NO_ENABLED_CHANNEL";

export type ReminderDeliveryChannel = "EMAIL" | "PUSH";

export interface ReminderPreferenceProps {
  userId: string;
  enabled: boolean;
  emailEnabled: boolean;
  reminderTime: string;
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
  }): ReminderPreference {
    if (!/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(props.reminderTime)) {
      throw new Error("Reminder time must be in HH:MM:SS format");
    }

    return new ReminderPreference({
      ...props,
      emailEnabled: props.emailEnabled ?? true,
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
  }): ReminderDelivery {
    return new ReminderDelivery({
      ...props,
      status: "PENDING",
      deliveryChannel: null,
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
