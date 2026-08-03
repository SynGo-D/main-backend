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


    // Handles creating a new project.
    router.post(
        "/",
        (req, res) => projectController.createProject(req, res)
    );


    return router;
}