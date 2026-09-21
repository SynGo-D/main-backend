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

            const { owner, repo } = params(req, "owner", "repo");
            const limit = req.query.limit ? Number(req.query.limit) : undefined;

            const result = await this.analysisEngineClient.listRepositoryAnalysis(owner, repo, limit);
            res.status(200).json(result);

        } catch (error) {
            this.handleError(res, error);
        }

    };

    getPullRequestAnalysis = async (req: Request, res: Response): Promise<void> => {

        try {

            const { owner, repo, number } = params(req, "owner", "repo", "number");

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

    /*
    Business rules. Bodies are forwarded as-is: analysis-engine validates
    them (rule id format, lengths, path patterns) and its 409/422 answers
    are relayed with their message.
    */

    listRules = async (req: Request, res: Response): Promise<void> => {
        try {
            const { owner, repo } = params(req, "owner", "repo");
            res.status(200).json(await this.analysisEngineClient.listRules(owner, repo));
        } catch (error) {
            this.handleError(res, error);
        }
    };

    addRule = async (req: Request, res: Response): Promise<void> => {
        try {
            const { owner, repo } = params(req, "owner", "repo");
            res.status(201).json(await this.analysisEngineClient.addRule(owner, repo, req.body));
        } catch (error) {
            this.handleError(res, error);
        }
    };

    changeRule = async (req: Request, res: Response): Promise<void> => {
        try {
            const { owner, repo, ruleId } = params(req, "owner", "repo", "ruleId");
            res.status(200).json(await this.analysisEngineClient.changeRule(owner, repo, ruleId, req.body));
        } catch (error) {
            this.handleError(res, error);
        }
    };

    deleteRule = async (req: Request, res: Response): Promise<void> => {
        try {
            const { owner, repo, ruleId } = params(req, "owner", "repo", "ruleId");
            await this.analysisEngineClient.deleteRule(owner, repo, ruleId);
            res.status(204).end();
        } catch (error) {
            this.handleError(res, error);
        }
    };

    suggestRules = async (req: Request, res: Response): Promise<void> => {
        try {
            const { owner, repo } = params(req, "owner", "repo");
            res.status(202).json(await this.analysisEngineClient.suggestRules(owner, repo, req.body ?? {}));
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

/*
Route parameters as plain strings. Express 5 types each one as
string | string[]; the routes here never repeat a parameter, so an array
would only mean a malformed request.
*/
function params<K extends string>(req: Request, ...names: K[]): Record<K, string> {
    const result = {} as Record<K, string>;
    for (const name of names) {
        const value = req.params[name];
        if (typeof value !== "string") {
            throw new ValidationError(`Invalid path parameter '${name}'.`);
        }
        result[name] = value;
    }
    return result;
}
