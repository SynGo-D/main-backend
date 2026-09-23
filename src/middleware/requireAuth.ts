import { Request, Response, NextFunction } from "express";
import { verifySession } from "../utils/jwt";

/**
 * Verifies the session token on the Authorization header and attaches the
 * caller's identity to the request. Every gateway route that touches
 * user-specific data sits behind this — the preview endpoint is the one
 * deliberate exception, since it's public repository metadata by design
 * (see RepositoryGatewayController).
 *
 * userId is read from the verified token from here on, never from a
 * request body or query param — a client claiming someone else's userId
 * in a POST body is exactly what this middleware closes off.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {

    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ message: "Missing or malformed Authorization header." });
        return;
    }

    const token = header.slice("Bearer ".length);

    try {
        const session = verifySession(token);
        req.userId = session.userId;
        req.userEmail = session.email;
        next();
    } catch {
        res.status(401).json({ message: "Invalid or expired session." });
    }

}
