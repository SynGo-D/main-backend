/**
 * RBAC middleware — FR-01.5, FR-01.9
 * -----------------------------------------------------------------------------
 * The permission matrix (from FR-01.6, FR-01.7, FR-01.8) is centralised in
 * ROLE_PERMISSIONS. Route handlers declare the permission they need; the
 * middleware checks the user's role has it. Deny by default.
 *
 * SOLID:
 *   - SRP: authorization is a distinct concern from authentication.
 *   - OCP: adding a new permission = add a string to the union and to the
 *     matrix. Existing checks don't change.
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import type { Role } from "./session.js";

export type Permission =
  | "integration.connect"       // Developer + Admin (FR-01.7 "connect repositories")
  | "integration.view"          // all authenticated users (dashboards)
  | "user.manage"               // Admin only (FR-01.6)
  | "system.configure";         // Admin only (FR-01.6)

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  administrator: [
    "integration.connect",
    "integration.view",
    "user.manage",
    "system.configure",
  ],
  developer: ["integration.connect", "integration.view"],
  project_manager: ["integration.view"],
};

export function hasPermission(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

export function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) {
    reply.code(401);
    reply.send({ code: "unauthenticated" });
    return false;
  }
  return true;
}

export function requirePermission(perm: Permission) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      reply.code(401);
      reply.send({ code: "unauthenticated" });
      return;
    }
    if (!hasPermission(req.user.role, perm)) {
      reply.code(403);
      reply.send({ code: "forbidden", requiredPermission: perm });
      return;
    }
  };
}
