import { Request, Response } from "express";

import { ValidationError } from "../errors/ValidationError";
import { ProjectService } from "../services/ProjectService";

/**
 * Handles HTTP requests related to projects.
 */
export class ProjectController {

    constructor(
        private readonly projectService: ProjectService
    ) {}

    /**
     * Creates a new project.
     */
    async createProject(req: Request, res: Response): Promise<void> {

        try {

            // Read values sent by the client.
            const { name, description } = req.body;

            // Delegate business logic to the service.
            const project = await this.projectService.createProject(
                name,
                description ?? null
            );

            // Return the newly created project.
            res.status(201).json(project);

        } catch (error) {

            // Validation errors become HTTP 400.
            if (error instanceof ValidationError) {

                res.status(400).json({
                    message: error.message
                });

                return;
            }

            console.error(error);

            // Unexpected errors become HTTP 500.
            res.status(500).json({
                message: "Internal server error."
            });

        }

    }

}