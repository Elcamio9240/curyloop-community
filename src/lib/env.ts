import { z } from "zod/v4";

const envSchema = z.object({
  DATABASE_PATH: z.string().default("/data/curyloop.db"),
  ENCRYPTION_KEY: z.string().min(64, "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  DISABLE_CLOUD_CTA: z.string().optional().transform(v => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.format());
    throw new Error("Invalid environment variables");
  }
  _env = result.data;
  return _env;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
