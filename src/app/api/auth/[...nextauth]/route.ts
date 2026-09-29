export const dynamic = "force-dynamic";

async function getHandlers() {
  const { handlers } = await import("@/auth");
  return handlers;
}

export async function GET(request: Request) {
  const { GET: handler } = await getHandlers();
  return handler(request);
}

export async function POST(request: Request) {
  const { POST: handler } = await getHandlers();
  return handler(request);
}
