import { Router } from "express";

import { ProjectController } from "../controllers/ProjectController";


/**
 * Creates project-related routes.
 *
 * Router is a mini Express application
 * responsible only for project URLs.
 */
export function createProjectRoutes(
    projectController: ProjectController
) {

    const router = Router();



    // Create a project
    router.post(
        "/",
        (req, res) =>
            projectController.createProject(req, res)
    );



    // Get all projects
    router.get(
        "/",
        (req, res) =>
            projectController.getProjects(req, res)
    );



    // Get one project by ID
    router.get(
        "/:id",
        (req, res) =>
            projectController.getProject(req, res)
    );



    // Delete project by ID
    router.delete(
        "/:id",
        (req, res) =>
            projectController.deleteProject(req, res)
    );

    // Handles updating an existing project.
    router.put(
        "/:id",
        (req, res) => 
            projectController.updateProject(req, res)
    );

    return router;
}