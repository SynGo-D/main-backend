/**
 * /integrations routes on the Main Backend (BFF)
 * -----------------------------------------------------------------------------
 * These are the ONLY integration-related endpoints the frontend ever calls.
 * The frontend never talks to the integration service directly.
 *
 *   POST /integrations/preview               → { preview }
 *   POST /integrations/oauth/start           → { authorizationUrl }
 *   GET  /integrations/oauth/:platform/callback?code=&state=
 *                                            → 302 to frontend callback page
 *   POST /integrations/connect               → { integration }
 *
 * Notes on the callback:
 *   The user's browser is redirected by GitHub/GitLab to a URL registered on
 *   the OAuth app. That URL is served by THIS backend (not the frontend, not
 *   the integration service). We do the code+state exchange here, then
 *   redirect the browser to the frontend's /integrations/callback page with
 *   the resulting integration id + status in the query string. This keeps
 *   client_secret out of the browser entirely and keeps CORS simple.
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/rbac.js";
import type {
  IntegrationClient,
  RepositoryPreviewDTO,
} from "../clients/IntegrationClient.js";
import { IntegrationClientError } from "../clients/IntegrationClient.js";

const PreviewBody = z.object({ url: z.string().url() });

const OAuthStartBody = z.object({
  platform: z.enum(["github", "gitlab"]),
  target: z
    .object({
      platform: z.enum(["github", "gitlab"]),
      kind: z.enum(["repository", "organization"]),
      owner: z.string().min(1),
      repo: z.string().min(1).optional(),
      hostBaseUrl: z.string().url(),
    })
    .optional(),
  returnTo: z.string().optional(),
});

const ConnectBody = z.object({
  integrationId: z.string().uuid(),
  target: z.object({
    platform: z.enum(["github", "gitlab"]),
    kind: z.enum(["repository", "organization"]),
    owner: z.string().min(1),
    repo: z.string().min(1).optional(),
    hostBaseUrl: z.string().url(),
  }),
  events: z.array(z.string()).optional(),
});

const CallbackQuery = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export interface IntegrationsRoutesDeps {
  integration: IntegrationClient;
  publicBaseUrl: string;    // this backend's public URL
  frontendOrigin: string;
  webhookIngestUrl: string; // integration service's public /webhooks/<platform> URL
}

export function integrationsRoutes(deps: IntegrationsRoutesDeps): FastifyPluginAsync {
  return async (app) => {
    // FR-02.1/02.2/02.5 — preview a URL. Requires only auth (not connect
    // permission) so PMs can also preview before asking a dev to connect.
    app.post("/preview", { preHandler: requireAuth as never }, async (req, reply) => {
      const parsed = PreviewBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400);
        return { code: "validation_error", details: parsed.error.flatten() };
      }
      try {
        const preview = await deps.integration.previewRepo(parsed.data.url);
        return { preview };
      } catch (err) {
        return handleUpstream(err, reply);
      }
    });

    // FR-02.3/02.6 — hand back an authorization URL the frontend will
    // window.location = to.
    app.post(
      "/oauth/start",
      { preHandler: requirePermission("integration.connect") },
      async (req, reply) => {
        const parsed = OAuthStartBody.safeParse(req.body);
        if (!parsed.success) {
          reply.code(400);
          return { code: "validation_error", details: parsed.error.flatten() };
        }
        try {
          // The OAuth redirect_uri is a route on THIS backend, so we handle
          // the exchange without exposing client_secret to the browser.
          const redirectUri = `${deps.publicBaseUrl}/integrations/oauth/${parsed.data.platform}/callback`;
          const start = await deps.integration.startOAuth({
            platform: parsed.data.platform,
            userId: req.user!.id,
            target: parsed.data.target,
            returnTo: parsed.data.returnTo,
            redirectUri,
          });
          return { authorizationUrl: start.authorizationUrl };
        } catch (err) {
          return handleUpstream(err, reply);
        }
      },
    );

    // GitHub/GitLab redirects the user's browser here after they click
    // "Authorize". We exchange the code, then bounce the browser to the
    // frontend with the result in the query string.
    app.get("/oauth/:platform/callback", async (req, reply) => {
      const platform = (req.params as { platform: string }).platform;
      if (platform !== "github" && platform !== "gitlab") {
        reply.code(404);
        return { code: "unknown_platform" };
      }
      if (!req.user) {
        // User's session expired between initiating and completing OAuth —
        // send them back to the login page with a hint.
        reply.redirect(`${deps.frontendOrigin}/?authRequired=1`);
        return;
      }
      const parsed = CallbackQuery.safeParse(req.query);
      if (!parsed.success) {
        reply.redirect(
          `${deps.frontendOrigin}/integrations/callback?error=invalid_callback`,
        );
        return;
      }
      const redirectUri = `${deps.publicBaseUrl}/integrations/oauth/${platform}/callback`;
      try {
        const result = await deps.integration.completeOAuth({
          platform,
          userId: req.user.id,
          code: parsed.data.code,
          state: parsed.data.state,
          redirectUri,
        });
        const url = new URL(
          `${deps.frontendOrigin}${result.returnTo ?? "/integrations/callback"}`,
        );
        url.searchParams.set("integrationId", result.integrationId);
        url.searchParams.set("login", result.externalUserLogin);
        url.searchParams.set("platform", platform);
        reply.redirect(url.toString());
      } catch (err) {
        const msg =
          err instanceof IntegrationClientError
            ? err.code
            : err instanceof Error
            ? err.message
            : "oauth_failed";
        reply.redirect(
          `${deps.frontendOrigin}/integrations/callback?error=${encodeURIComponent(msg)}`,
        );
      }
    });

    // FR-02.4 — finalize by registering the webhook.
    app.post(
      "/connect",
      { preHandler: requirePermission("integration.connect") },
      async (req, reply) => {
        const parsed = ConnectBody.safeParse(req.body);
        if (!parsed.success) {
          reply.code(400);
          return { code: "validation_error", details: parsed.error.flatten() };
        }
        try {
          // Build the platform-specific delivery URL — the integration
          // service has ONE public /webhooks/<platform> path each.
          const deliveryUrl = `${deps.webhookIngestUrl}/${parsed.data.target.platform}`;
          const result = await deps.integration.connectRepo({
            userId: req.user!.id,
            integrationId: parsed.data.integrationId,
            target: parsed.data.target as RepositoryPreviewDTO["target"],
            deliveryUrl,
            events: parsed.data.events,
          });
          return result;
        } catch (err) {
          return handleUpstream(err, reply);
        }
      },
    );
  };
}

function handleUpstream(err: unknown, reply: import("fastify").FastifyReply) {
  if (err instanceof IntegrationClientError) {
    reply.code(err.httpStatus >= 400 && err.httpStatus < 600 ? err.httpStatus : 502);
    return { code: err.code, message: err.message };
  }
  reply.code(500);
  return {
    code: "internal_error",
    message: err instanceof Error ? err.message : String(err),
  };
}
