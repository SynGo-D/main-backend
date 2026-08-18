/**
 * /auth routes
 * -----------------------------------------------------------------------------
 * Demo-quality auth so the rest of the flow can be exercised locally. A real
 * deployment should replace this with the identity provider your org uses
 * (Google Workspace via OIDC, Azure AD, Auth0, etc). The shape of the user
 * object exposed via req.user (id, email, role) stays the same, so the
 * downstream handlers don't change.
 *
 * FR-01 mapping — the DEMO handler here supplies:
 *   - FR-01.1 authentication (via email + role picker in dev)
 *   - FR-01.4 role assignment
 *   - FR-01.10 logout
 *
 * FR-01.6/07/08 (per-role permissions) are enforced by rbac.ts on the
 * integration routes.
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  setSessionCookie,
  clearSessionCookie,
  type Role,
  type SessionUser,
} from "../middleware/session.js";
import { randomUUID } from "node:crypto";

const LoginBody = z.object({
  email: z.string().email(),
  role: z.enum(["administrator", "developer", "project_manager"]).default("developer"),
});

export function authRoutes(deps: { sessionSecret: string }): FastifyPluginAsync {
  return async (app) => {
    app.post("/login", async (req, reply) => {
      const parsed = LoginBody.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400);
        return { code: "validation_error", details: parsed.error.flatten() };
      }
      // Deterministic user id per email so the same "user" persists across
      // dev logins (useful for reusing OAuth integrations).
      const user: SessionUser = {
        id: `dev-${Buffer.from(parsed.data.email).toString("hex").slice(0, 24)}`,
        email: parsed.data.email,
        role: parsed.data.role as Role,
      };
      setSessionCookie(reply, user, deps.sessionSecret);
      return { user };
    });

    app.get("/me", async (req, reply) => {
      if (!req.user) {
        reply.code(401);
        return { code: "unauthenticated" };
      }
      return { user: req.user };
    });

    app.post("/logout", async (_req, reply) => {
      clearSessionCookie(reply);
      return { ok: true };
    });
  };
}
