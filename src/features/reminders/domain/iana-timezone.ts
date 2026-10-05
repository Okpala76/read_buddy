const RAW_OFFSET_TIMEZONE = /^(?:(?:UTC|GMT)\s*)?[+-]\d/i;

export function isValidIanaTimezone(value: string): boolean {
  if (!value || RAW_OFFSET_TIMEZONE.test(value)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function normalizeIanaTimezone(value: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions()
    .timeZone;
}
