/**
 * Main backend env config.
 * -----------------------------------------------------------------------------
 * Same pattern as the integration service: Zod-validated, fail-fast at boot.
 */

import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // Where our own frontend runs (used for the OAuth returnTo and CORS).
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),

  // Our own public base URL (backend). The OAuth apps must be configured to
  // redirect here. Example: http://localhost:4000 in dev.
  PUBLIC_BASE_URL: z.string().url(),

  // Where the integration service is reachable on the internal network.
  INTEGRATION_SERVICE_URL: z.string().url(),

  // Shared secret with the integration service (must match).
  INTERNAL_API_KEY: z.string().min(16),

  // HMAC secret for signing user session cookies.
  SESSION_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:", parsed.error.format());
    throw new Error("Environment validation failed");
  }
  return parsed.data;
}
