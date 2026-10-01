export enum ReminderDeliveryStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

export type DeliveryStatusValue = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export interface ReminderPreferenceProps {
  userId: string;
  enabled: boolean;
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
    reminderTime: string;
  }): ReminderPreference {
    if (!/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(props.reminderTime)) {
      throw new Error("Reminder time must be in HH:MM:SS format");
    }

    return new ReminderPreference({
      ...props,
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

  toPersistence(): ReminderPreferenceProps {
    return { ...this.props };
  }
}

export interface ReminderDeliveryProps {
  id: string;
  userId: string;
  status: DeliveryStatusValue;
  scheduledFor: Date;
  sentAt: Date | null;
  attemptCount: number;
  providerMessageId: string | null;
  errorCode: string | null;
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
    scheduledFor: Date;
  }): ReminderDelivery {
    return new ReminderDelivery({
      ...props,
      status: "PENDING",
      sentAt: null,
      attemptCount: 0,
      providerMessageId: null,
      errorCode: null,
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

  get status(): DeliveryStatusValue {
    return this.props.status;
  }

  get scheduledFor(): Date {
    return this.props.scheduledFor;
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

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  markSent(providerMessageId: string): ReminderDelivery {
    return new ReminderDelivery({
      ...this.props,
      status: "SENT",
      sentAt: new Date(),
      providerMessageId,
      updatedAt: new Date(),
    });
  }

  markFailed(errorCode: string): ReminderDelivery {
    return new ReminderDelivery({
      ...this.props,
      status: "FAILED",
      attemptCount: this.props.attemptCount + 1,
      errorCode,
      updatedAt: new Date(),
    });
  }

  markSkipped(): ReminderDelivery {
    return new ReminderDelivery({
      ...this.props,
      status: "SKIPPED",
      updatedAt: new Date(),
    });
  }

  incrementAttempt(): ReminderDelivery {
    return new ReminderDelivery({
      ...this.props,
      attemptCount: this.props.attemptCount + 1,
      updatedAt: new Date(),
    });
  }

  toPersistence(): ReminderDeliveryProps {
    return { ...this.props };
  }
}

export interface ReminderPreferenceRepository {
  findByUserId(userId: string): Promise<ReminderPreference | null>;
  save(preference: ReminderPreference): Promise<void>;
}

export interface ReminderDeliveryRepository {
  findByUserIdAndScheduledFor(
    userId: string,
    scheduledFor: Date,
  ): Promise<ReminderDelivery | null>;
  findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<ReminderDelivery[]>;
  findPendingByScheduledBefore(
    scheduledBefore: Date,
    limit: number,
  ): Promise<ReminderDelivery[]>;
  findByStatus(
    status: DeliveryStatusValue,
    limit?: number,
    offset?: number,
  ): Promise<ReminderDelivery[]>;
  save(delivery: ReminderDelivery): Promise<void>;
  saveMany(deliveries: ReminderDelivery[]): Promise<void>;
}
