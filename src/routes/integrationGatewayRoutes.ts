import { Router } from "express";
import { IntegrationGatewayController } from "../controllers/IntegrationGatewayController";
import { requireAuth } from "../middleware/requireAuth";

/**
 * Final URLs (all behind requireAuth):
 *
 *   POST   /api/integrations/authorize
 *   GET    /api/integrations
 *   GET    /api/integrations/:id
 *   DELETE /api/integrations/:id
 */
export function createIntegrationGatewayRoutes(controller: IntegrationGatewayController) {

    const router = Router();

    router.use(requireAuth);

    router.post(
        "/authorize",
        (req, res) => controller.authorize(req, res)
    );

    router.get(
        "/",
        (req, res) => controller.list(req, res)
    );

    router.get(
        "/:id",
        (req, res) => controller.getById(req, res)
    );

    router.delete(
        "/:id",
        (req, res) => controller.revoke(req, res)
    );

    return router;
}
