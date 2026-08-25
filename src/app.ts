import express from "express";
import cors from "cors";

import { env } from "./config/env";

import { ProjectRepository } from "./repositories/ProjectRepository";
import { ProjectService } from "./services/ProjectService";
import { ProjectController } from "./controllers/ProjectController";

import { IntegrationServiceClient } from "./clients/IntegrationServiceClient";
import { AnalysisEngineClient } from "./clients/AnalysisEngineClient";
import { AuthController } from "./controllers/AuthController";
import { IntegrationGatewayController } from "./controllers/IntegrationGatewayController";
import { RepositoryGatewayController } from "./controllers/RepositoryGatewayController";

import { createProjectRoutes } from "./routes/projectRoutes";
import { createAuthRoutes } from "./routes/authRoutes";
import { createIntegrationGatewayRoutes } from "./routes/integrationGatewayRoutes";
import { createRepositoryGatewayRoutes } from "./routes/repositoryGatewayRoutes";


const app = express();


/*
    Middleware
    These run before every request.

    CORS is scoped to FRONTEND_ORIGIN, not wide open — this is now the one
    service the browser is allowed to talk to directly; integration-service
    and analysis-engine are reached only server-to-server from here.
*/

app.use(cors({ origin: env.frontendOrigin }));

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

const integrationServiceClient = new IntegrationServiceClient();
const analysisEngineClient = new AnalysisEngineClient();

const authController = new AuthController(
    integrationServiceClient
);

const integrationGatewayController = new IntegrationGatewayController(
    integrationServiceClient
);

const repositoryGatewayController = new RepositoryGatewayController(
    integrationServiceClient,
    analysisEngineClient
);



/*
    Register Routes

    Final URLs:

    POST   /api/projects
    POST   /api/auth/login
    GET    /api/repositories/preview
    GET    /api/repositories/:owner/:repo/analysis
    GET    /api/repositories/:owner/:repo/analysis/pull-requests/:number
    POST   /api/integrations/authorize
    GET    /api/integrations
    GET    /api/integrations/:id
    DELETE /api/integrations/:id
*/
app.use(
    "/api/projects",
    createProjectRoutes(projectController)
);

app.use(
    "/api/auth",
    createAuthRoutes(authController)
);

app.use(
    "/api/repositories",
    createRepositoryGatewayRoutes(repositoryGatewayController)
);

app.use(
    "/api/integrations",
    createIntegrationGatewayRoutes(integrationGatewayController)
);



/*
    Health Check

    Used to verify that the service is alive.
*/
app.get("/health", (_req, res)=>{

    res.status(200).json({
        status:"UP",
        service:"main-backend"
    });

});


export default app;