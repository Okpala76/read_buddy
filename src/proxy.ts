import { auth } from "@/auth";

export const proxy = auth((req) => {
  const isAuthenticated = !!req.auth;
  const isAuthRoute =
    req.nextUrl.pathname === "/auth" ||
    req.nextUrl.pathname.startsWith("/auth/");
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isCronRoute = req.nextUrl.pathname === "/api/cron/reminders";

  if (isApiAuthRoute || isCronRoute) {
    return;
  }

  if (!isAuthenticated && !isAuthRoute && req.nextUrl.pathname !== "/") {
    const signInUrl = new URL("/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set(
      "callbackUrl",
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
    );

    return Response.redirect(signInUrl);
  }

  if (isAuthenticated && req.nextUrl.pathname === "/auth/signin") {
    return Response.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
