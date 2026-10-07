"use client";

import { useEffect, useEffectEvent, useState } from "react";
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

type ReminderFormData = z.infer<typeof reminderSchema>;

interface ReminderPreference {
  enabled: boolean;
  emailEnabled: boolean;
  reminderTime: string;
  timezone: string;
  updatedAt: string;
}

interface ToastMessage {
  title: string;
  description: string;
  variant: "default" | "destructive";
}

export function ReminderSettingsForm() {
  const [preference, setPreference] = useState<ReminderPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [suggestedTimezone, setSuggestedTimezone] = useState<string | null>(
    null,
  );

  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      enabled: false,
      emailEnabled: true,
      reminderTime: "19:00",
      timezone: "UTC",
    },
  });
  const selectedTimezone = useWatch({
    control: form.control,
    name: "timezone",
  });

  const [isEnabled, setIsEnabled] = useState(false);

  const handleEnabledChange = (checked: boolean) => {
    setIsEnabled(checked);
    form.setValue("enabled", checked);
  };

  const showToast = (message: ToastMessage) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };
  const showLoadError = useEffectEvent(() => {
    showToast({
      title: "Error",
      description: "Failed to load reminder settings",
      variant: "destructive",
    });
  });
  const { reset } = form;

  useEffect(() => {
    let mounted = true;

    const loadPreference = async () => {
      try {
        const response = await fetch("/api/reminders");
        if (!response.ok) throw new Error("Failed to load");
        const data = await response.json();

        if (mounted) {
          const browserTimezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (isValidIanaTimezone(browserTimezone)) {
            setSuggestedTimezone(browserTimezone);
          }
          setPreference(data.updatedAt ? data : null);
          reset({
            enabled: data.enabled,
            emailEnabled: data.emailEnabled,
            reminderTime: data.reminderTime.slice(0, 5),
            timezone: data.timezone,
          });
          setIsEnabled(data.enabled);
        }
      } catch {
        if (mounted) {
          showLoadError();
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadPreference();
    return () => {
      mounted = false;
    };
  }, [reset]);

  const handleSubmit = async (data: ReminderFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: data.enabled,
          emailEnabled: data.emailEnabled,
          reminderTime: `${data.reminderTime}:00`,
          timezone: data.timezone,
        }),
      });
      if (!response.ok) throw new Error("Failed to save");
      const preferenceData = await response.json();
      setPreference(preferenceData);
      form.reset({
        enabled: preferenceData.enabled,
        emailEnabled: preferenceData.emailEnabled,
        reminderTime: preferenceData.reminderTime.slice(0, 5),
        timezone: preferenceData.timezone,
      });
      setIsEnabled(preferenceData.enabled);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2
          className="text-primary h-8 w-8 animate-spin"
          aria-hidden="true"
        />
      </div>
    );
  }

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
                    onCheckedChange={handleEnabledChange}
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
                    disabled={!isEnabled}
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
                  disabled={!isEnabled}
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
              <Label htmlFor="timezone">Timezone</Label>
              <div className="flex items-center gap-2">
                <Globe2
                  className="text-muted-foreground h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <Input
                  id="timezone"
                  type="text"
                  autoComplete="off"
                  placeholder="Africa/Lagos"
                  {...form.register("timezone")}
                />
              </div>
              <p className="text-muted-foreground text-sm">
                Reminder time uses this IANA timezone, including daylight saving
                changes.
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

          {preference && (
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
