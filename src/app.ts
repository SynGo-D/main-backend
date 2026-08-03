import express from "express";
import cors from "cors";

import { ProjectRepository } from "./repositories/ProjectRepository";
import { ProjectService } from "./services/ProjectService";
import { ProjectController } from "./controllers/ProjectController";

import { createProjectRoutes } from "./routes/projectRoutes";


const app = express();


/*
    Middleware
    These run before every request.
*/

app.use(cors());

app.use(express.json());



/*
    Dependency Injection

    Create objects once when the application starts.

    Flow:

    Repository
          |
          ▼
    Service
          |
          ▼
    Controller
*/
const projectRepository = new ProjectRepository();

const projectService = new ProjectService(
    projectRepository
);

const projectController = new ProjectController(
    projectService
);



/*
    Register Routes

    Final URL:

    POST /api/projects
*/
app.use(
    "/api/projects",
    createProjectRoutes(projectController)
);



/*
    Health Check

    Used to verify that the service is alive.
*/
app.get("/health", (req, res)=>{

    res.status(200).json({
        status:"UP",
        service:"main-backend"
    });

});


export default app;