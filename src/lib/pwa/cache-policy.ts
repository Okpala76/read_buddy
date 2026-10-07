const SENSITIVE_PATH_PREFIXES = [
  "/api",
  "/__clerk",
  "/sign-in",
  "/sign-up",
] as const;

export function isSensitivePathname(pathname: string): boolean {
  return SENSITIVE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isStaticAssetRequest({
  request,
  sameOrigin,
  url,
}: {
  request: Request;
  sameOrigin: boolean;
  url: URL;
}): boolean {
  return (
    sameOrigin &&
    request.method === "GET" &&
    url.pathname.startsWith("/_next/static/")
  );
}
