const [baseUrl, expectedRelease] = process.argv.slice(2);

if (!baseUrl || !expectedRelease) {
  throw new Error("Usage: node check-health.mjs <base-url> <release-sha>");
}

const healthUrl = new URL("/api/health", baseUrl);
const healthCheckSecret = process.env.HEALTH_CHECK_SECRET;

if (!healthCheckSecret) {
  throw new Error("HEALTH_CHECK_SECRET is required");
}

const headers = { Authorization: `Bearer ${healthCheckSecret}` };

if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  headers["x-vercel-protection-bypass"] =
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}

let lastError;

for (let attempt = 1; attempt <= 12; attempt += 1) {
  try {
    const response = await fetch(healthUrl, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json();

    if (
      response.ok &&
      body.status === "ok" &&
      body.database === "ok" &&
      body.release === expectedRelease
    ) {
      console.log(
        `Health check passed for release ${expectedRelease.slice(0, 12)}.`,
      );
      process.exit(0);
    }

    lastError = new Error(
      `status=${response.status} database=${body.database} release=${body.release}`,
    );
  } catch (error) {
    lastError = error;
  }

  console.log(`Health check attempt ${attempt}/12 has not passed yet.`);
  await new Promise((resolve) => setTimeout(resolve, 5_000));
}

throw new Error(`Production health verification failed: ${lastError}`);
