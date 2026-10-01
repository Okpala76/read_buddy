import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.url().startsWith("postgresql://"),
  DATABASE_SSL: z
    .enum(["disable", "require", "verify-full"])
    .default("require"),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(50).default(10),
  DATABASE_CA_CERT: z.string().min(1).optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.email().optional(),
  CRON_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.url().optional(),
});

export const env = serverEnvironmentSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_SSL: process.env.DATABASE_SSL,
  DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
  DATABASE_CA_CERT: process.env.DATABASE_CA_CERT,
  NODE_ENV: process.env.NODE_ENV,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  CRON_SECRET: process.env.CRON_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const config = {
  DATABASE_URL: env.DATABASE_URL,
  DATABASE_SSL: env.DATABASE_SSL,
  DATABASE_POOL_MAX: env.DATABASE_POOL_MAX,
  DATABASE_CA_CERT: env.DATABASE_CA_CERT,
  NODE_ENV: env.NODE_ENV,
  RESEND_API_KEY: env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: env.RESEND_FROM_EMAIL ?? "noreply@readbuddy.local",
  CRON_SECRET: env.CRON_SECRET,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};
