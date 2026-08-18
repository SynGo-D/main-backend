/**
 * Session middleware
 * -----------------------------------------------------------------------------
 * Minimal signed-cookie session for demo purposes. It stores an internal
 * userId + role in an HMAC-signed cookie so we can move forward with FR-01
 * (RBAC) without pulling in an entire auth library.
 *
 * PRODUCTION NOTE — replace this with your real auth (NextAuth on the
 * frontend, or issue JWTs from your identity provider). The shape of the
 * request.user object stays the same.
 */

import type { FastifyRequest, FastifyReply, FastifyPluginCallback } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";

export type Role = "administrator" | "developer" | "project_manager";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
}

const COOKIE_NAME = "cp_session";

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeSession(user: SessionUser, secret: string): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeSession(cookie: string, secret: string): SessionUser | null {
  const parts = cookie.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser;
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export const sessionPlugin: FastifyPluginCallback<{ secret: string }> = (
  fastify,
  opts,
  done,
) => {
  fastify.decorateRequest("user", undefined);
  fastify.addHook("preHandler", async (req: FastifyRequest) => {
    const cookies = parseCookies(req.headers.cookie);
    const raw = cookies[COOKIE_NAME];
    if (!raw) return;
    const user = decodeSession(raw, opts.secret);
    if (user) req.user = user;
  });
  done();
};

export function setSessionCookie(reply: FastifyReply, user: SessionUser, secret: string) {
  const value = encodeSession(user, secret);
  reply.header(
    "set-cookie",
    `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 8}`,
  );
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.header("set-cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
