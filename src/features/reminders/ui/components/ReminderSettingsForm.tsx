"use client";

import { useState, useSyncExternalStore } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bell,
  CheckCircle2,
  Clock,
  Globe2,
  Loader2,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isValidIanaTimezone } from "@/features/reminders/domain/iana-timezone";
import { updateReminderPreference } from "../reminder-actions";

const reminderSchema = z.object({
  enabled: z.boolean(),
  emailEnabled: z.boolean(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
  timezone: z
    .string()
    .trim()
    .refine(isValidIanaTimezone, "Enter a valid IANA timezone"),
});

const reminderPreferenceResponseSchema = reminderSchema.extend({
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/),
  updatedAt: z.string().optional(),
});

const fallbackTimezones = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Pacific/Auckland",
];

function getSupportedTimezones(): string[] {
  const supportedValuesOf = (
    Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    }
  ).supportedValuesOf;
  return supportedValuesOf ? supportedValuesOf("timeZone") : fallbackTimezones;
}

const browserTimezones = getSupportedTimezones();
const browserTimezone =
  typeof window === "undefined"
    ? null
    : Intl.DateTimeFormat().resolvedOptions().timeZone;

function subscribeToBrowserSettings() {
  return () => undefined;
}

function getBrowserTimezones() {
  return browserTimezones;
}

function getServerTimezones() {
  return fallbackTimezones;
}

function getBrowserTimezone() {
  return browserTimezone && isValidIanaTimezone(browserTimezone)
    ? browserTimezone
    : null;
}

function getServerTimezone() {
  return null;
}

type ReminderFormData = z.infer<typeof reminderSchema>;

export interface ReminderSettingsView {
  enabled: boolean;
  emailEnabled: boolean;
  reminderTime: string;
  timezone: string;
  updatedAt?: string;
}

interface ToastMessage {
  title: string;
  description: string;
  variant: "default" | "destructive";
}

export function ReminderSettingsForm({
  initialPreference,
}: {
  initialPreference: ReminderSettingsView;
}) {
  const [preference, setPreference] =
    useState<ReminderSettingsView>(initialPreference);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const suggestedTimezone = useSyncExternalStore(
    subscribeToBrowserSettings,
    getBrowserTimezone,
    getServerTimezone,
  );
  const availableTimezones = useSyncExternalStore(
    subscribeToBrowserSettings,
    getBrowserTimezones,
    getServerTimezones,
  );

  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      enabled: initialPreference.enabled,
      emailEnabled: initialPreference.emailEnabled,
      reminderTime: initialPreference.reminderTime.slice(0, 5),
      timezone: initialPreference.timezone,
    },
  });

  const selectedTimezone = useWatch({
    control: form.control,
    name: "timezone",
  });
  const remindersEnabled = useWatch({
    control: form.control,
    name: "enabled",
  });
  const emailEnabled = useWatch({
    control: form.control,
    name: "emailEnabled",
  });

  const timezoneOptions = Array.from(
    new Set(
      ["UTC", selectedTimezone, suggestedTimezone, ...availableTimezones].filter(
        (timezone): timezone is string => Boolean(timezone),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const showToast = (message: ToastMessage) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (data: ReminderFormData) => {
    setIsSaving(true);
    try {
      const parsed = reminderPreferenceResponseSchema.safeParse(
        await updateReminderPreference({
          enabled: data.enabled,
          emailEnabled: data.emailEnabled,
          reminderTime: `${data.reminderTime}:00`,
          timezone: data.timezone,
        }),
      );
      if (!parsed.success) throw new Error("Invalid reminder response");

      const preferenceData = parsed.data;
      setPreference(preferenceData);
      form.reset({
        enabled: preferenceData.enabled,
        emailEnabled: preferenceData.emailEnabled,
        reminderTime: preferenceData.reminderTime.slice(0, 5),
        timezone: preferenceData.timezone,
      });
      showToast({
        title: "Saved",
        description: "Reminder settings updated successfully",
        variant: "default",
      });
    } catch {
      showToast({
        title: "Error",
        description: "Failed to save reminder settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <section className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
        <div className="border-border bg-muted/35 flex items-start justify-between gap-5 border-b p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="text-primary size-5" aria-hidden="true" />
              <h2 className="text-foreground text-lg font-semibold">
                Your reminder plan
              </h2>
            </div>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm">
              {remindersEnabled
                ? "Reading Buddy will nudge you when you have not logged reading that day."
                : "Reminders are currently paused. Your reading history and streak tracking still work normally."}
            </p>
          </div>

          <Controller
            name="enabled"
            control={form.control}
            render={({ field }) => (
              <Switch
                id="enabled"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Reading reminders"
              />
            )}
          />
        </div>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-7 p-5 sm:p-6"
        >
          <div className={remindersEnabled ? "" : "opacity-60"}>
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                <Clock className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <Label htmlFor="reminderTime" className="text-base font-semibold">
                  Reminder time
                </Label>
                <p className="text-muted-foreground mt-1 text-sm">
                  Pick a time that usually leaves you enough room to read.
                </p>
                <Input
                  id="reminderTime"
                  type="time"
                  {...form.register("reminderTime")}
                  disabled={!remindersEnabled}
                  className="mt-3 w-40"
                />
                {form.formState.errors.reminderTime && (
                  <p className="text-destructive mt-2 text-sm">
                    {form.formState.errors.reminderTime.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-border border-t pt-6">
            <div className="flex items-start justify-between gap-5">
              <div className="flex min-w-0 items-start gap-4">
                <div className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <Mail className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <Label htmlFor="emailEnabled" className="text-base font-semibold">
                    Email fallback
                  </Label>
                  <p className="text-muted-foreground mt-1 max-w-xl text-sm">
                    Keep email available when push is not connected on a device.
                    Reading Buddy sends one normal reminder, not both.
                  </p>
                </div>
              </div>
              <Controller
                name="emailEnabled"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="emailEnabled"
                    checked={field.value}
                    disabled={!remindersEnabled}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            {remindersEnabled && (
              <p className="text-muted-foreground mt-3 pl-14 text-xs">
                {emailEnabled
                  ? "Email is available as your fallback channel."
                  : "Email fallback is off. A connected push device will be required for notifications."}
              </p>
            )}
          </div>

          <details className="border-border border-t pt-6">
            <summary className="text-foreground flex min-h-11 cursor-pointer list-none items-center justify-between font-medium">
              <span className="flex items-center gap-2">
                <Globe2 className="text-muted-foreground size-4" aria-hidden="true" />
                Reading day timezone
              </span>
              <span className="text-muted-foreground text-sm">
                {selectedTimezone}
              </span>
            </summary>

            <div className="mt-4 space-y-3 pl-0 sm:pl-6">
              <Label htmlFor="timezone">Account timezone</Label>
              <select
                id="timezone"
                {...form.register("timezone")}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {timezoneOptions.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-sm">
                This defines your local reading day for reminders, streaks and
                analytics, including daylight saving changes.
              </p>
              {suggestedTimezone && suggestedTimezone !== selectedTimezone && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    form.setValue("timezone", suggestedTimezone, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  Use browser timezone: {suggestedTimezone}
                </Button>
              )}
              {form.formState.errors.timezone && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.timezone.message}
                </p>
              )}
            </div>
          </details>

          {form.formState.isDirty && (
            <div
              className="bg-muted text-muted-foreground flex items-center gap-2 rounded-xl p-3 text-sm"
              role="status"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              You have unsaved changes.
            </div>
          )}

          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>

          {preference?.updatedAt && (
            <p className="text-muted-foreground text-xs">
              Last updated{" "}
              {new Date(preference.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </form>
      </section>

      {toast && (
        <div
          className={`fixed right-4 bottom-4 left-4 z-50 rounded-xl px-4 py-3 text-sm shadow-lg sm:left-auto sm:max-w-sm ${
            toast.variant === "destructive"
              ? "bg-destructive text-destructive-foreground"
              : "bg-background text-foreground border-border border"
          }`}
          role="alert"
        >
          <div className="font-medium">{toast.title}</div>
          <div className="text-sm opacity-90">{toast.description}</div>
        </div>
      )}
    </div>
  );
}
