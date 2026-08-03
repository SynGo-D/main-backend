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

}