import type {
  ReminderPreferenceRepository,
  ReadingBehaviorProfileRepository,
  EffectiveReminderTimeResult,
  GetEffectiveReminderTimeUseCase,
} from "../domain";

export type { GetEffectiveReminderTimeUseCase };

import { computeEffectiveReminderTime } from "../domain/adaptive-timing";

export class GetEffectiveReminderTimeUseCaseImpl implements GetEffectiveReminderTimeUseCase {
  constructor(
    private readonly preferenceRepository: ReminderPreferenceRepository,
    private readonly profileRepository: ReadingBehaviorProfileRepository,
  ) {}

  async execute(
    userId: string,
    now: Date,
  ): Promise<EffectiveReminderTimeResult> {
    const [preference, profile] = await Promise.all([
      this.preferenceRepository.findByUserId(userId),
      this.profileRepository.findByUserId(userId),
    ]);

    const timezone = await this.profileRepository.getUserTimezone(userId);

    const preferenceData: {
      adaptiveTimingEnabled: boolean;
      reminderTime: string;
      quietHoursStart: string;
      quietHoursEnd: string;
      streakRescueTime: string;
    } = preference
      ? {
          adaptiveTimingEnabled: preference.adaptiveTimingEnabled,
          reminderTime: preference.reminderTime,
          quietHoursStart: preference.quietHoursStart,
          quietHoursEnd: preference.quietHoursEnd,
          streakRescueTime: preference.streakRescueTime,
        }
      : {
          adaptiveTimingEnabled: false,
          reminderTime: "19:00:00",
          quietHoursStart: "22:30:00",
          quietHoursEnd: "07:00:00",
          streakRescueTime: "21:30:00",
        };

    const profileData = profile ?? {
      userId,
      sampleDays: 0,
      typicalReadingMinute: 0,
      weekdaySampleDays: 0,
      weekdayTypicalMinute: null,
      weekendSampleDays: 0,
      weekendTypicalMinute: null,
      windowStart: now,
      computedAt: now,
    };

    return computeEffectiveReminderTime(
      profileData,
      preferenceData,
      timezone,
      now,
    );
  }
}
