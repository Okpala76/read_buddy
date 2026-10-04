import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware((_auth, request) => {
  if (request.nextUrl.hostname !== "read-buddy-eight.vercel.app") {
    return;
  }

  const canonicalUrl = request.nextUrl.clone();
  canonicalUrl.hostname = "read-buddy.ogalandlord.com.ng";

  return NextResponse.redirect(canonicalUrl, 308);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
