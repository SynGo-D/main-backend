import { Router } from "express";
import { RepositoryGatewayController } from "../controllers/RepositoryGatewayController";
import { requireAuth } from "../middleware/requireAuth";

/**
 * Final URLs:
 *
 *   GET /api/repositories/preview?url=...                                    (public)
 *   GET /api/repositories/:owner/:repo/analysis                              (requireAuth)
 *   GET /api/repositories/:owner/:repo/analysis/pull-requests/:number        (requireAuth)
 *
 * requireAuth is applied per-route, not via router.use(), because /preview
 * is deliberately public — see RepositoryGatewayController.preview.
 */
export function createRepositoryGatewayRoutes(controller: RepositoryGatewayController) {

    const router = Router();

    router.get(
        "/preview",
        (req, res) => controller.preview(req, res)
    );

    router.get(
        "/:owner/:repo/analysis",
        requireAuth,
        (req, res) => controller.listAnalysis(req, res)
    );

    router.get(
        "/:owner/:repo/analysis/pull-requests/:number",
        requireAuth,
        (req, res) => controller.getPullRequestAnalysis(req, res)
    );

    return router;
}
