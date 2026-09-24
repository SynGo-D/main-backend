import { NextFunction, Request, Response } from "express";
import { IntegrationServiceClient } from "../clients/IntegrationServiceClient";

/**
 * Confirms the signed-in user may see this repository before any of its
 * data is fetched.
 *
 * requireAuth proves who is asking. It does not prove they are allowed to
 * ask about *this* repository, and the repository routes took owner/repo
 * straight from the URL — so any signed-in account could read any
 * repository's analyses, AI reviews (which quote source), business rules,
 * contributors and spend, and could add, edit or delete another
 * organization's rules. Belonging to no organization at all was enough.
 *
 * Access follows organization membership, which is the model the rest of
 * the platform already uses: an admin creates an organization, connects
 * repositories to it, and adds people by email.
 *
 * The check cannot live further down. analysis-engine stores no
 * organization at all — its database has no such column — so it has no
 * way to answer the question. This gateway is the only place that both
 * knows the session and can ask integration-service.
 *
 * 404, never 403: a "forbidden" would confirm that a repository exists
 * and is connected to somebody, which is exactly what OrganizationService
 * refuses to reveal about organizations.
 */
export function requireRepositoryAccess(client: IntegrationServiceClient) {

    return async function (req: Request, res: Response, next: NextFunction): Promise<void> {

        const userId = req.userId;
        const owner = String(req.params.owner ?? "");
        const repo = String(req.params.repo ?? "");

        if (!userId || !owner || !repo) {
            res.status(404).json({ message: "Repository not found." });
            return;
        }

        try {
            const allowed = await client.canAccessRepository(userId, owner, repo);

            if (!allowed) {
                res.status(404).json({ message: "Repository not found." });
                return;
            }

            next();

        } catch (error) {
            // Fail closed. If integration-service cannot be reached we do
            // not know whether this user is a member, and guessing "yes"
            // is how the original bug would come back during an outage.
            console.error("[gateway] repository access check failed:", error);
            res.status(503).json({ message: "Could not verify repository access. Please try again." });
        }

    };

}
