import { Request, Response } from "express";
import { OrganizationServiceClient } from "../clients/IntegrationServiceClient";
import { UpstreamServiceError } from "../errors/UpstreamServiceError";
import { ValidationError } from "../errors/ValidationError";

/*
Proxies organizations, members and projects to integration-service, which
owns users and therefore tenancy.

main-backend adds one thing of its own: the acting user, taken from the
verified session (requireAuth) and never from the request. Every
membership and role check happens in integration-service.
*/
export class OrganizationGatewayController {

    constructor(private readonly client: OrganizationServiceClient) {}

    listOrganizations = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.client.listOrganizations(req.userId!));
        } catch (error) {
            this.handleError(res, error);
        }
    };

    createOrganization = async (req: Request, res: Response): Promise<void> => {
        try {
            const { name } = req.body as { name?: string };
            res.status(201).json(await this.client.createOrganization(req.userId!, name ?? ""));
        } catch (error) {
            this.handleError(res, error);
        }
    };

    getOrganization = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.client.getOrganization(req.userId!, this.param(req, "organizationId")));
        } catch (error) {
            this.handleError(res, error);
        }
    };

    listMembers = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.client.listMembers(req.userId!, this.param(req, "organizationId")));
        } catch (error) {
            this.handleError(res, error);
        }
    };

    addMember = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(201).json(await this.client.addMember(req.userId!, this.param(req, "organizationId"), req.body));
        } catch (error) {
            this.handleError(res, error);
        }
    };

    changeMemberRole = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.client.changeMemberRole(
                req.userId!, this.param(req, "organizationId"), this.param(req, "memberUserId"), req.body
            );
            res.status(204).end();
        } catch (error) {
            this.handleError(res, error);
        }
    };

    removeMember = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.client.removeMember(
                req.userId!, this.param(req, "organizationId"), this.param(req, "memberUserId")
            );
            res.status(204).end();
        } catch (error) {
            this.handleError(res, error);
        }
    };

    listProjects = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.client.listProjects(req.userId!, this.param(req, "organizationId")));
        } catch (error) {
            this.handleError(res, error);
        }
    };

    createProject = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(201).json(await this.client.createProject(req.userId!, this.param(req, "organizationId"), req.body));
        } catch (error) {
            this.handleError(res, error);
        }
    };

    updateProject = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.client.updateProject(
                req.userId!, this.param(req, "organizationId"), this.param(req, "projectId"), req.body
            ));
        } catch (error) {
            this.handleError(res, error);
        }
    };

    deleteProject = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.client.deleteProject(req.userId!, this.param(req, "organizationId"), this.param(req, "projectId"));
            res.status(204).end();
        } catch (error) {
            this.handleError(res, error);
        }
    };

    assignRepository = async (req: Request, res: Response): Promise<void> => {
        try {
            const { projectId } = req.body as { projectId?: string | null };
            await this.client.assignRepository(
                req.userId!, this.param(req, "organizationId"), this.param(req, "integrationId"), projectId ?? null
            );
            res.status(204).end();
        } catch (error) {
            this.handleError(res, error);
        }
    };

    /** Express 5 types route params as string | string[]; these routes never repeat one. */
    private param(req: Request, name: string): string {
        const value = req.params[name];

        if (typeof value !== "string" || !value) {
            throw new ValidationError(`Invalid path parameter '${name}'.`);
        }
        return value;
    }

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
