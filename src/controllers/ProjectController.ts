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


    /**
     * Returns all projects.
     */
    async getProjects(
        req: Request<{id:string}>,
        res: Response
    ): Promise<void> {


        try {


            const projects =
                await this.projectService.getProjects();


            res.status(200).json(projects);



        } catch(error) {


            console.error(error);


            res.status(500).json({
                message:"Internal server error."
            });

        }

    }






    /**
     * Returns a single project by ID.
     */
    async getProject(
        req: Request<{id:string}>,
        res: Response
    ): Promise<void> {


        try {


            const project =
                await this.projectService.getProject(
                    req.params.id
                );


            res.status(200).json(project);



        } catch(error) {


            if(error instanceof ValidationError){

                res.status(404).json({
                    message:error.message
                });

                return;
            }


            console.error(error);


            res.status(500).json({
                message:"Internal server error."
            });

        }

    }






    /**
     * Deletes a project.
     */
    async deleteProject(
        req: Request<{id:string}>,
        res: Response
    ): Promise<void> {


        try {


            const project =
                await this.projectService.deleteProject(
                    req.params.id
                );


            res.status(200).json({
                message:"Project deleted successfully",
                project
            });



        } catch(error) {


            if(error instanceof ValidationError){

                res.status(404).json({
                    message:error.message
                });

                return;
            }


            console.error(error);


            res.status(500).json({
                message:"Internal server error."
            });

        }

    }    

    /**
     * Updates an existing project.
     */
    async updateProject(
        req: Request<{ id: string }>,
        res: Response
    ): Promise<void> {

        try {

            const { name, description } = req.body;

            const project =
                await this.projectService.updateProject(
                    req.params.id,
                    name,
                    description ?? null
                );

            res.status(200).json(project);

        } catch (error) {

            if (error instanceof ValidationError) {

                res.status(400).json({
                    message: error.message
                });

                return;

            }

            console.error(error);

            res.status(500).json({
                message: "Internal server error."
            });

        }

    }

}