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

    return this.mapRow(row);
    

}

/**
 * Retrieves all projects.
 */
async findAll(): Promise<Project[]> {

    const query = `
        SELECT
            id,
            name,
            description,
            created_at,
            updated_at
        FROM projects
        ORDER BY created_at DESC;
    `;


    const result = await pool.query(query);


    return result.rows.map(row => this.mapRow(row));

}

/**
* Retrieves a single project by ID.
*/
async findById(
    id:string
): Promise<Project | null> {


    const query = `
        SELECT
            id,
            name,
            description,
            created_at,
            updated_at
        FROM projects
        WHERE id = $1;
    `;


    const result = await pool.query(query, [
        id
    ]);


    if(result.rows.length === 0){
        return null;
    }


    return this.mapRow(result.rows[0]);

    }

    /**
     * Deletes a project by ID.
     */
    async delete(
        id:string
    ): Promise<Project | null>{


        const query = `
            DELETE FROM projects
            WHERE id = $1
            RETURNING
                id,
                name,
                description,
                created_at,
                updated_at;
        `;


        const result = await pool.query(query, [
            id
        ]);


        if(result.rows.length === 0){
            return null;
        }


        return this.mapRow(result.rows[0]);

    }

    /**
     * Updates an existing project.
     */
    async update(
        id: string,
        name: string,
        description: string | null
    ): Promise<Project | null> {

        const query = `
            UPDATE projects
            SET
                name = $2,
                description = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING
                id,
                name,
                description,
                created_at,
                updated_at;
        `;

        const result = await pool.query(query, [
            id,
            name,
            description
        ]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRow(result.rows[0]);

    }


    /**
     * Converts PostgreSQL row format
     * into application Project model format.
     */
    private mapRow(row:any): Project {

        return {
            id: row.id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };

    }

}
