import { Request, Response } from "express";
import { IntegrationServiceClient } from "../clients/IntegrationServiceClient";
import { UpstreamServiceError } from "../errors/UpstreamServiceError";
import { ValidationError } from "../errors/ValidationError";
import { signSession } from "../utils/jwt";

/**
 * Login is a thin front for integration-service's find-or-create user
 * endpoint: main-backend doesn't own its own users table (integration-service
 * already does, and duplicating it would just be two sources of truth for
 * the same identity) — it only adds a session on top, so web-interface has
 * a real token instead of a bare userId it could hand over for anyone.
 */
export class AuthController {

    constructor(
        private readonly integrationServiceClient: IntegrationServiceClient
    ) {}

    login = async (req: Request, res: Response): Promise<void> => {

        try {

            const { email, fullName } = req.body as { email?: string; fullName?: string };

            if (!email || !fullName) {
                throw new ValidationError("email and fullName are required.");
            }

            const user = await this.integrationServiceClient.createOrFindUser(email, fullName);

            const token = signSession({ userId: user.id, email: user.email });

            res.status(200).json({ token, user });

        } catch (error) {
            this.handleError(res, error);
        }

    };

    private handleError(res: Response, error: unknown): void {

        if (error instanceof ValidationError) {
            res.status(400).json({ message: error.message });
            return;
        }

        if (error instanceof UpstreamServiceError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }

        console.error(error);
        res.status(500).json({ message: "Internal server error." });

    }

}
