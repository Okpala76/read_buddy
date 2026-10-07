import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);

const optionalVapidPublicKey = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .length(87)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
);

const optionalVapidPrivateKey = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .length(43)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
);

const optionalVapidSubject = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .url()
    .refine(
      (value) => value.startsWith("mailto:") || value.startsWith("https://"),
      "VAPID subject must use mailto: or https:",
    )
    .optional(),
);

export const serverEnvironmentSchema = z
  .object({
    DATABASE_URL: z.url().startsWith("postgresql://"),

    DATABASE_SSL: z
      .enum(["disable", "require", "verify-full"])
      .default("require"),

    DATABASE_POOL_MAX: z.coerce.number().int().positive().max(50).default(10),

    DATABASE_CA_CERT: optionalString,

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    RESEND_API_KEY: optionalString,
    RESEND_FROM_EMAIL: optionalString,
    CRON_SECRET: optionalString,
    NEXT_PUBLIC_APP_URL: optionalUrl,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: optionalVapidPublicKey,
    VAPID_PRIVATE_KEY: optionalVapidPrivateKey,
    VAPID_SUBJECT: optionalVapidSubject,
  })
  .superRefine((value, context) => {
    const configuredVapidValues = [
      value.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      value.VAPID_PRIVATE_KEY,
      value.VAPID_SUBJECT,
    ].filter(Boolean).length;

    if (configuredVapidValues !== 0 && configuredVapidValues !== 3) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_VAPID_PUBLIC_KEY"],
        message: "All VAPID variables must be configured together",
      });
    }
  });

export const env = serverEnvironmentSchema.parse(process.env);

export const config = {
  DATABASE_URL: env.DATABASE_URL,
  DATABASE_SSL: env.DATABASE_SSL,
  DATABASE_POOL_MAX: env.DATABASE_POOL_MAX,
  DATABASE_CA_CERT: env.DATABASE_CA_CERT,
  NODE_ENV: env.NODE_ENV,
  RESEND_API_KEY: env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: env.RESEND_FROM_EMAIL,
  CRON_SECRET: env.CRON_SECRET,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: env.VAPID_SUBJECT,
};
