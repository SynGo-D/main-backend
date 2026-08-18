/**
 * Main Backend (BFF) — bootstrap
 * -----------------------------------------------------------------------------
 * Composition root for the main backend.
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import { loadEnv } from "./config/env.js";
import { createLogger } from "./utils/logger.js";
import { sessionPlugin } from "./middleware/session.js";
import { authRoutes } from "./routes/auth.routes.js";
import { integrationsRoutes } from "./routes/integrations.routes.js";
import { IntegrationClient } from "./clients/IntegrationClient.js";

async function main() {
  const env = loadEnv();
  const log = createLogger("main-backend");

  const app = Fastify({ logger: false });

  // CORS — only the frontend origin, and credentials on (cookies).
  await app.register(cors, {
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  });

  await app.register(sessionPlugin, { secret: env.SESSION_SECRET });

  const integration = new IntegrationClient({
    baseUrl: env.INTEGRATION_SERVICE_URL,
    apiKey: env.INTERNAL_API_KEY,
  });

  await app.register(authRoutes({ sessionSecret: env.SESSION_SECRET }), {
    prefix: "/auth",
  });

  await app.register(
    integrationsRoutes({
      integration,
      publicBaseUrl: env.PUBLIC_BASE_URL,
      frontendOrigin: env.FRONTEND_ORIGIN,
      // NB: in local dev with docker-compose, the webhook ingest URL must be
      // reachable BY GITHUB — that means the PUBLIC (tunnelled) URL of the
      // integration service, not its internal DNS name. Set it here based on
      // env; we use the integration service's PUBLIC_BASE_URL as configured
      // there and passed to us via env if you want; for the sample compose
      // stack we just use INTEGRATION_SERVICE_URL, which works if the ingest
      // path is reachable from github (via tunnel).
      webhookIngestUrl: `${env.INTEGRATION_SERVICE_URL}/webhooks`,
    }),
    { prefix: "/integrations" },
  );

  app.get("/healthz", async () => ({ status: "ok" }));

  app.setErrorHandler((err, _req, reply) => {
    log.error("unhandled error", { err: err.message });
    reply.code(reply.statusCode >= 400 ? reply.statusCode : 500);
    reply.send({ code: "internal_error", message: err.message });
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  log.info(`main-backend listening on ${env.PORT}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start main-backend:", err);
  process.exit(1);
});
