import { auth } from "@/auth";

export const proxy = auth(
  (req: { auth: { user: { id: string } } | null; nextUrl: URL }) => {
    const isAuthenticated = !!req.auth;
    const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");
    const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

    if (isApiAuthRoute) {
      return;
    }

    if (!isAuthenticated && !isAuthRoute && req.nextUrl.pathname !== "/") {
      const signInUrl = new URL("/auth/signin", req.nextUrl.origin);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);

      return Response.redirect(signInUrl);
    }

    if (isAuthenticated && isAuthRoute) {
      return Response.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
  },
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
