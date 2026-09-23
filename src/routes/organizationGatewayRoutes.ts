import { Router } from "express";
import { OrganizationGatewayController } from "../controllers/OrganizationGatewayController";
import { requireAuth } from "../middleware/requireAuth";

/**
 * Final URLs (all behind requireAuth; roles are enforced in
 * integration-service from the caller's membership):
 *
 *   GET,  POST   /api/organizations
 *   GET          /api/organizations/:organizationId
 *   GET,  POST   /api/organizations/:organizationId/members
 *   PATCH, DELETE /api/organizations/:organizationId/members/:memberUserId
 *   GET,  POST   /api/organizations/:organizationId/projects
 *   PATCH, DELETE /api/organizations/:organizationId/projects/:projectId
 *   PUT          /api/organizations/:organizationId/repositories/:integrationId/project
 */
export function createOrganizationGatewayRoutes(controller: OrganizationGatewayController): Router {
    const router = Router();

    router.use(requireAuth);

    router.get("/", controller.listOrganizations);
    router.post("/", controller.createOrganization);
    router.get("/:organizationId", controller.getOrganization);

    router.get("/:organizationId/members", controller.listMembers);
    router.post("/:organizationId/members", controller.addMember);
    router.patch("/:organizationId/members/:memberUserId", controller.changeMemberRole);
    router.delete("/:organizationId/members/:memberUserId", controller.removeMember);

    router.get("/:organizationId/projects", controller.listProjects);
    router.post("/:organizationId/projects", controller.createProject);
    router.patch("/:organizationId/projects/:projectId", controller.updateProject);
    router.delete("/:organizationId/projects/:projectId", controller.deleteProject);

    router.put("/:organizationId/repositories/:integrationId/project", controller.assignRepository);

    return router;
}
