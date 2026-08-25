import { Request, Response } from "express";
import { IntegrationServiceClient } from "../clients/IntegrationServiceClient";
import { UpstreamServiceError } from "../errors/UpstreamServiceError";
import { ValidationError } from "../errors/ValidationError";

/**
 * Gateway for repository-connection endpoints. Every method here sits
 * behind requireAuth (wired in routes/integrationGatewayRoutes.ts) — the
 * one thing worth calling out is that userId always comes from
 * req.userId (the verified session), never from the request body:
 * integration-service's own /authorize took a client-supplied userId
 * directly, which was fine when it was only ever called from trusted
 * server code (this gateway) but would have let any caller act as any
 * user if web-interface had kept calling it directly.
 */
export class IntegrationGatewayController {

    constructor(
        private readonly integrationServiceClient: IntegrationServiceClient
    ) {}

    authorize = async (req: Request, res: Response): Promise<void> => {

        try {

            const { repositoryUrl } = req.body as { repositoryUrl?: string };

            if (!repositoryUrl) {
                throw new ValidationError("repositoryUrl is required.");
            }

            const result = await this.integrationServiceClient.authorizeIntegration(
                req.userId!,
                repositoryUrl
            );

            res.status(200).json(result);

        } catch (error) {
            this.handleError(res, error);
        }

    };

    list = async (req: Request, res: Response): Promise<void> => {

        try {

            const integrations = await this.integrationServiceClient.listIntegrations(req.userId!);
            res.status(200).json(integrations);

        } catch (error) {
            this.handleError(res, error);
        }

    };

    getById = async (req: Request, res: Response): Promise<void> => {

        try {

            const integration = await this.integrationServiceClient.getIntegration(req.params.id);

            if (integration.userId !== req.userId) {
                res.status(404).json({ message: "Integration not found." });
                return;
            }

            res.status(200).json(integration);

        } catch (error) {
            this.handleError(res, error);
        }

    };

    revoke = async (req: Request, res: Response): Promise<void> => {

        try {

            const integration = await this.integrationServiceClient.getIntegration(req.params.id);

            if (integration.userId !== req.userId) {
                res.status(404).json({ message: "Integration not found." });
                return;
            }

            await this.integrationServiceClient.revokeIntegration(req.params.id);

            res.status(200).json({ message: "Integration revoked successfully." });

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
