export type InstallPlatform =
  "ios-safari" | "ios-other" | "android" | "desktop" | "other-mobile";

export function getInstallPlatform(userAgent: string): InstallPlatform {
  const ios =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent));
  if (ios) {
    return /Safari/i.test(userAgent) &&
      !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent)
      ? "ios-safari"
      : "ios-other";
  }
  if (/Android/i.test(userAgent)) return "android";
  if (/Mobile|Mobi/i.test(userAgent)) return "other-mobile";
  return "desktop";
}

export function isStandaloneInstall(
  displayStandalone: boolean,
  navigatorStandalone?: boolean,
): boolean {
  return displayStandalone || navigatorStandalone === true;
}

export const INSTALL_DISMISSAL_KEY =
  "reading-buddy:pwa-install-dismissed-until:v1";
export const INSTALL_DISMISSAL_MS = 7 * 24 * 60 * 60 * 1000;

export function shouldShowInstallPrompt(
  installed: boolean,
  platform: InstallPlatform,
  dismissedUntil: number,
  now: number,
): boolean {
  return !installed && platform !== "desktop" && now >= dismissedUntil;
}
