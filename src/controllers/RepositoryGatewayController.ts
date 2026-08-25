import { Request, Response } from "express";
import { IntegrationServiceClient } from "../clients/IntegrationServiceClient";
import { AnalysisEngineClient } from "../clients/AnalysisEngineClient";
import { UpstreamServiceError } from "../errors/UpstreamServiceError";
import { ValidationError } from "../errors/ValidationError";

export class RepositoryGatewayController {

    constructor(
        private readonly integrationServiceClient: IntegrationServiceClient,
        private readonly analysisEngineClient: AnalysisEngineClient
    ) {}

    /**
     * Deliberately not behind requireAuth: this is public repository
     * metadata (name, stars, language, ...), the same data GitHub/GitLab
     * would serve to anyone. Requiring a session here would also break the
     * server-side preview route in web-interface, which calls this from
     * Next's own server (no access to the browser's stored token) rather
     * than from the browser directly.
     */
    preview = async (req: Request, res: Response): Promise<void> => {

        try {

            const url = req.query.url as string | undefined;

            if (!url) {
                throw new ValidationError("Query parameter 'url' is required.");
            }

            const preview = await this.integrationServiceClient.previewRepository(url);
            res.status(200).json(preview);

        } catch (error) {
            this.handleError(res, error);
        }

    };

    listAnalysis = async (req: Request, res: Response): Promise<void> => {

        try {

            const { owner, repo } = req.params;
            const limit = req.query.limit ? Number(req.query.limit) : undefined;

            const result = await this.analysisEngineClient.listRepositoryAnalysis(owner, repo, limit);
            res.status(200).json(result);

        } catch (error) {
            this.handleError(res, error);
        }

    };

    getPullRequestAnalysis = async (req: Request, res: Response): Promise<void> => {

        try {

            const { owner, repo, number } = req.params;

            const result = await this.analysisEngineClient.getPullRequestAnalysis(
                owner,
                repo,
                Number(number)
            );
            res.status(200).json(result);

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
