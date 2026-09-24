import { Router } from "express";
import { IntegrationServiceClient } from "../clients/IntegrationServiceClient";
import { RepositoryGatewayController } from "../controllers/RepositoryGatewayController";
import { requireAuth } from "../middleware/requireAuth";
import { requireRepositoryAccess } from "../middleware/requireRepositoryAccess";

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
 * Everything under /:owner/:repo is guarded once, by the router rather
 * than route by route. Applying it per-route means every new repository
 * route has to remember it, and the one that forgets is indistinguishable
 * from the ones that did not — which is how every one of these routes came
 * to be readable by any signed-in account regardless of who owned the
 * repository.
 *
 * /preview stays public and is unaffected: it is a single path segment,
 * so it never matches /:owner/:repo. See
 * RepositoryGatewayController.preview for why it is public.
 */
export function createRepositoryGatewayRoutes(
    controller: RepositoryGatewayController,
    integrationServiceClient: IntegrationServiceClient
) {

    const router = Router();

    router.get(
        "/preview",
        (req, res) => controller.preview(req, res)
    );

    // Who is asking, then whether they may ask about this repository.
    router.use("/:owner/:repo", requireAuth, requireRepositoryAccess(integrationServiceClient));

    router.get(
        "/:owner/:repo/analysis",
        (req, res) => controller.listAnalysis(req, res)
    );

    router.get(
        "/:owner/:repo/analysis/pull-requests/:number",
        (req, res) => controller.getPullRequestAnalysis(req, res)
    );

    router.get("/:owner/:repo/contributors", (req, res) => controller.contributors(req, res));

    router.get("/:owner/:repo/rules", (req, res) => controller.listRules(req, res));
    router.post("/:owner/:repo/rules", (req, res) => controller.addRule(req, res));
    // Before the /:ruleId routes, so "suggest" isn't read as a rule id.
    router.post("/:owner/:repo/rules/suggest", (req, res) => controller.suggestRules(req, res));
    router.patch("/:owner/:repo/rules/:ruleId", (req, res) => controller.changeRule(req, res));
    router.delete("/:owner/:repo/rules/:ruleId", (req, res) => controller.deleteRule(req, res));

    router.put(
        "/:owner/:repo/analysis/pull-requests/:number/review/findings/:fingerprint/feedback",
        (req, res) => controller.giveFeedback(req, res)
    );
    router.get("/:owner/:repo/review-usage", (req, res) => controller.reviewUsage(req, res));

    return router;
}
