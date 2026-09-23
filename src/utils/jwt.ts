import jwt from "jsonwebtoken";
import { env } from "../config/env";

/**
 * Session tokens issued at login. Payload is intentionally small — just
 * enough to identify the caller on every subsequent request, so
 * integration-service's userId never has to be trusted from a request body
 * again (see IntegrationGatewayController: userId now always comes from
 * the verified token, not from whatever the client claims).
 */
export interface SessionPayload {
    userId: string;
    email: string;
}

const TOKEN_TTL = "7d";

export function signSession(payload: SessionPayload): string {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: TOKEN_TTL });
}

/** Throws (jwt.JsonWebTokenError / TokenExpiredError) on an invalid or expired token. */
export function verifySession(token: string): SessionPayload {
    return jwt.verify(token, env.jwtSecret) as SessionPayload;
}
