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
 *   GET  /api/repositories/:owner/:repo/debt                                     (requireAuth)
 *   GET  /api/repositories/:owner/:repo/debt/summary                             (requireAuth)
 *   GET  /api/repositories/:owner/:repo/debt/pull-requests/:number               (requireAuth)
 *   POST /api/repositories/:owner/:repo/debt/pull-requests/:number/calculate     (requireAuth)
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

    /*
    Technical debt. These forward to technical-debt-service, which has no
    authentication of its own — it trusts whatever can reach it, and only
    main-backend can. They are placed here rather than behind a proxy route
    in web-interface for exactly that reason: the router guard above is
    what makes them safe, and a Next route handler has no access to the
    browser's stored token to apply an equivalent one.

    Order does not matter between them: each path is literal apart from
    :number, so none can shadow another the way /rules/suggest could be
    read as /rules/:ruleId.
    */
    router.get("/:owner/:repo/debt", (req, res) => controller.listDebtReviews(req, res));
    router.get("/:owner/:repo/debt/summary", (req, res) => controller.debtSummary(req, res));
    router.get(
        "/:owner/:repo/debt/pull-requests/:number",
        (req, res) => controller.pullRequestDebt(req, res)
    );
    router.post(
        "/:owner/:repo/debt/pull-requests/:number/calculate",
        (req, res) => controller.calculatePullRequestDebt(req, res)
    );

    return router;
}
