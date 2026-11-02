const appRoots = [
  "/dashboard",
  "/books",
  "/reading",
  "/sessions",
  "/analytics",
  "/friends",
  "/reminders",
  "/settings",
];
export function recoveryPath(current: string, previous: string | null) {
  const valid = (path: string | null): path is string =>
    !!path &&
    appRoots.some((root) => path === root || path.startsWith(root + "/")) &&
    !path.includes("\\") &&
    !path.includes("?") &&
    !path.includes("#") &&
    !path.includes("%") &&
    !path.split("/").some((part) => part === "." || part === "..");
  return valid(current) ? current : valid(previous) ? previous : "/dashboard";
}
export function returnToApp(path: string) {
  window.location.assign(path);
}
