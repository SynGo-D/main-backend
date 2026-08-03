import { randomUUID } from "crypto";

import { pool } from "../database";
import { Project } from "../models/Project";

/**
 * Handles all database operations related to Projects.
 * Only this class communicates directly with PostgreSQL.
 */
export class ProjectRepository {
/**
 * Creates a new project and stores it in the database.
 */
async create(
    name: string,
    description: string | null
): Promise<Project> {

    // Generate a unique identifier for the new project.
    const id = randomUUID();

    // SQL statement with parameter placeholders.
    const query = `
        INSERT INTO projects (
            id,
            name,
            description
        )
        VALUES ($1, $2, $3)
        RETURNING
            id,
            name,
            description,
            created_at,
            updated_at;
    `;

    // Execute the SQL query safely using parameterized values.
    const result = await pool.query(query, [
        id,
        name,
        description
    ]);

    // Extract the inserted row.
    const row = result.rows[0];

    // Convert database column names to our model naming.
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };

}
}
