/**
 * Represents a project managed by the platform.
 * This mirrors one row in the "projects" database table.
 */
export interface Project {

    // Unique identifier of the project.
    id: string;

    // User-friendly project name.
    name: string;

    // Optional project description.
    description: string | null;

    // Timestamp when the project was created.
    createdAt: Date;

    // Timestamp of the last update.
    updatedAt: Date;

}