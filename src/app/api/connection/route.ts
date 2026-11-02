import { NextResponse } from "next/server";
import { z } from "zod";
export const dynamic = "force-dynamic";
/** A public reachability probe; no database, user data, or health credentials. */
export async function GET(request: Request) {
  const parsed = z
    .string()
    .uuid()
    .safeParse(new URL(request.url).searchParams.get("nonce"));
  if (!parsed.success)
    return NextResponse.json(
      { reachable: false },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  return NextResponse.json(
    { reachable: true, nonce: parsed.data },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
