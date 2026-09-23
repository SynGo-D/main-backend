import { Router } from "express";
import { RepositoryGatewayController } from "../controllers/RepositoryGatewayController";
import { requireAuth } from "../middleware/requireAuth";

/**
 * Final URLs:
 *
 *   GET /api/repositories/preview?url=...                                    (public)
 *   GET /api/repositories/:owner/:repo/analysis                              (requireAuth)
 *   GET /api/repositories/:owner/:repo/analysis/pull-requests/:number        (requireAuth)
 *   GET /api/repositories/:owner/:repo/contributors                          (requireAuth)
 *   GET, POST          /api/repositories/:owner/:repo/rules                  (requireAuth)
 *   PATCH, DELETE      /api/repositories/:owner/:repo/rules/:ruleId          (requireAuth)
 *   POST               /api/repositories/:owner/:repo/rules/suggest          (requireAuth)
 *   PUT  /api/repositories/:owner/:repo/analysis/pull-requests/:number/review/findings/:fingerprint/feedback  (requireAuth)
 *   GET  /api/repositories/:owner/:repo/review-usage?days=30                    (requireAuth)
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

    router.get("/:owner/:repo/contributors", requireAuth, (req, res) => controller.contributors(req, res));

    router.get("/:owner/:repo/rules", requireAuth, (req, res) => controller.listRules(req, res));
    router.post("/:owner/:repo/rules", requireAuth, (req, res) => controller.addRule(req, res));
    // Before the /:ruleId routes, so "suggest" isn't read as a rule id.
    router.post("/:owner/:repo/rules/suggest", requireAuth, (req, res) => controller.suggestRules(req, res));
    router.patch("/:owner/:repo/rules/:ruleId", requireAuth, (req, res) => controller.changeRule(req, res));
    router.delete("/:owner/:repo/rules/:ruleId", requireAuth, (req, res) => controller.deleteRule(req, res));

    router.put(
        "/:owner/:repo/analysis/pull-requests/:number/review/findings/:fingerprint/feedback",
        requireAuth,
        (req, res) => controller.giveFeedback(req, res)
    );
    router.get("/:owner/:repo/review-usage", requireAuth, (req, res) => controller.reviewUsage(req, res));

    return router;
}
