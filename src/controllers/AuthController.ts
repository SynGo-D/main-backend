import { Request, Response } from "express";
import { IntegrationServiceClient } from "../clients/IntegrationServiceClient";
import { UpstreamServiceError } from "../errors/UpstreamServiceError";
import { ValidationError } from "../errors/ValidationError";
import { signSession } from "../utils/jwt";

/**
 * Registering and signing in.
 *
 * main-backend doesn't own a users table — integration-service already
 * does, and two of them would be two answers to "who is this person". So
 * the password is checked there, where the hash lives, and this controller
 * turns a successful check into the session token the browser then carries.
 *
 * A password reaches this file and goes straight back out to
 * integration-service. It is never logged, stored or put in a token.
 */
export class AuthController {

    constructor(
        private readonly integrationServiceClient: IntegrationServiceClient
    ) {}

    login = async (req: Request, res: Response): Promise<void> => {

        try {

            const { email, password } = req.body as { email?: string; password?: string };

            if (!email || !password) {
                throw new ValidationError("email and password are required.");
            }

            const user = await this.integrationServiceClient.authenticateUser(email, password);
            const token = signSession({ userId: user.id, email: user.email });

            res.status(200).json({ token, user });

        } catch (error) {
            this.handleError(res, error);
        }

    };

    /**
     * Signing up. Someone an admin has already added to an organization
     * registers with that same address: integration-service recognises the
     * account and sets its password, so the membership they were given
     * still applies.
     */
    register = async (req: Request, res: Response): Promise<void> => {

        try {

            const { email, fullName, password } = req.body as {
                email?: string; fullName?: string; password?: string;
            };

            if (!email || !fullName || !password) {
                throw new ValidationError("email, fullName and password are required.");
            }

            const user = await this.integrationServiceClient.registerUser(email, fullName, password);
            const token = signSession({ userId: user.id, email: user.email });

            // Signed in straight away: having just proved they chose this
            // password, asking for it again would be ceremony.
            res.status(201).json({ token, user });

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
