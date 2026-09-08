import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required").default("dev-secret-change-me"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-flash-lite-latest"),
  ALLOW_PRIVATE_HOSTS: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  LLM_MAX_CONCURRENCY: z.coerce.number().default(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

// The dev default keeps `npm run dev` frictionless locally, but it must never reach a
// deployed environment — a shared, known JWT secret would let anyone forge a session.
if (env.NODE_ENV === "production" && env.JWT_SECRET === "dev-secret-change-me") {
  throw new Error("JWT_SECRET must be set to a real secret in production (refusing the dev default).");
}
if (env.NODE_ENV === "production" && env.ALLOW_PRIVATE_HOSTS) {
  throw new Error("ALLOW_PRIVATE_HOSTS must not be true in production (Section 11: reject private/loopback addresses).");
}

export const corsOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
