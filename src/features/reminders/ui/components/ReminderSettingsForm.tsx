"use client";

import { useState, useSyncExternalStore } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Bell, Clock, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  const timezoneOptions = Array.from(
    new Set(
      [
        "UTC",
        selectedTimezone,
        suggestedTimezone,
        ...availableTimezones,
      ].filter((timezone): timezone is string => Boolean(timezone)),
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
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="text-primary h-5 w-5" aria-hidden="true" />
            <CardTitle className="text-foreground">Reading Reminders</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enabled">Reading reminders</Label>
                <p className="text-muted-foreground text-sm">
                  Remind me if I have not logged reading that day
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
                  />
                )}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="emailEnabled">Email reminders</Label>
                <p className="text-muted-foreground text-sm">
                  On by default. Email is used when push is unavailable.
                </p>
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

            <p className="bg-muted text-muted-foreground rounded-lg p-3 text-sm">
              Push is preferred when this account has an active subscribed
              device. Reading Buddy sends one normal reminder, not both push and
              email.
            </p>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="reminderTime">Reminder Time</Label>
              <div className="flex items-center gap-2">
                <Clock
                  className="text-muted-foreground h-4 w-4"
                  aria-hidden="true"
                />
                <Input
                  id="reminderTime"
                  type="time"
                  {...form.register("reminderTime")}
                  disabled={!remindersEnabled}
                  className="w-40"
                />
              </div>
              {form.formState.errors.reminderTime && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.reminderTime.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Account timezone</Label>
              <div className="flex items-center gap-2">
                <Globe2
                  className="text-muted-foreground h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
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
              </div>
              <p className="text-muted-foreground text-sm">
                This controls reminder times, streaks, analytics, and daily
                boundaries, including daylight saving changes.
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

            {form.formState.isDirty && (
              <p className="text-muted-foreground text-sm" role="status">
                You have unsaved changes. Select Save Settings to keep them.
              </p>
            )}

            <Button type="submit" disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </form>

          {preference?.updatedAt && (
            <div className="border-border mt-6 border-t pt-6">
              <p className="text-muted-foreground text-sm">
                Last updated:{" "}
                {new Date(preference.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {toast && (
        <div
          className={`fixed right-4 bottom-4 left-4 z-50 rounded-lg px-4 py-3 text-sm shadow-lg sm:left-auto sm:max-w-sm ${
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
