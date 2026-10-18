import { timingSafeEqual } from "node:crypto";

import { config } from "@/config/env";
import { databasePool } from "@/db/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const expected = config.HEALTH_CHECK_SECRET;
  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer /, "");

  if (!expected || !provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  if (!databasePool) {
    return NextResponse.json(
      { status: "error", database: "unavailable" },
      { status: 503 },
    );
  }

  try {
    await databasePool.query("select 1");

    return NextResponse.json(
      {
        status: "ok",
        database: "ok",
        release: process.env.RELEASE_SHA ?? "unknown",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Production health database check failed", error);
    return NextResponse.json(
      { status: "error", database: "unavailable" },
      { status: 503 },
    );
  }
}
