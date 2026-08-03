import { Project } from "../models/Project";
import { ProjectRepository } from "../repositories/ProjectRepository";
import { ValidationError } from "../errors/ValidationError";
/**
 * Handles business logic related to projects.
 * Controllers call this class instead of accessing the database directly.
 */
export class ProjectService {

    constructor(
        private readonly repository: ProjectRepository      //Depe
    ) {}

    /**
     * Creates a new project after validating the input.
     */
    async createProject(
        name: string,
        description: string | null
    ): Promise<Project> {

        // Remove unnecessary whitespace.
        name = name.trim();

        // Business rule: Project name cannot be empty.
        if (!name) {
            throw new ValidationError("Project name is required.");
        }

        return this.repository.create(
            name,
            description
        );
    }



    /**
     * Retrieves all projects.
     */
    async getProjects(): Promise<Project[]> {

        return this.repository.findAll();

    }




    /**
     * Retrieves a project by ID.
     */
    async getProject(
        id:string
    ): Promise<Project> {


        const project =
            await this.repository.findById(id);



        if(!project){

            throw new ValidationError(
                "Project not found."
            );

        }


        return project;

    }





    /**
     * Deletes a project by ID.
     */
    async deleteProject(
        id:string
    ): Promise<Project> {


        const project =
            await this.repository.delete(id);



        if(!project){

            throw new ValidationError(
                "Project not found."
            );

        }


        return project;

    }


    /**
     * Updates an existing project.
     */
    async updateProject(
        id: string,
        name: string,
        description: string | null
    ): Promise<Project> {

        name = name.trim();

        if (!name) {
            throw new ValidationError(
                "Project name is required."
            );
        }

        const project = await this.repository.update(
            id,
            name,
            description
        );

        if (!project) {
            throw new ValidationError(
                "Project not found."
            );
        }

        return project;

    }
}