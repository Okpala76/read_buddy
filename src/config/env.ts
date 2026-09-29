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
});

export const env = serverEnvironmentSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_SSL: process.env.DATABASE_SSL,
  DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
  DATABASE_CA_CERT: process.env.DATABASE_CA_CERT,
  NODE_ENV: process.env.NODE_ENV,
});
