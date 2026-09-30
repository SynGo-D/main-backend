import { env } from "../config/env";
import { UpstreamServiceError } from "../errors/UpstreamServiceError";

/*
Thin HTTP wrapper around technical-debt-service.

It exists for the same reason AnalysisEngineClient does — keeping "which
service, which URL" out of the controllers — and it matters more here,
because technical-debt-service has no authentication of its own. It trusts
whatever can reach it, which is only ever main-backend over the private
compose network. That is the same arrangement analysis-engine and
integration-service are under, and it is only safe while the routes in
front of it are guarded: see repositoryGatewayRoutes, where every debt
route sits under requireRepositoryAccess.

Before this client existed, web-interface proxied the browser straight to
this service with no session check at all, which made every organisation's
remediation costs, file paths and security counts readable by anyone who
could guess owner/repo.
*/

async function request<T>(
    path: string,
    init: { method?: string; userId?: string } = {}
): Promise<T> {

    const headers: Record<string, string> = {};
    // Who is asking, from main-backend's verified session. The debt service
    // does not check it today; sending it means a later audit trail there
    // needs no change here.
    if (init.userId) headers["X-User-Id"] = init.userId;

    const response = await fetch(`${env.technicalDebtServiceUrl}${path}`, {
        method: init.method ?? "GET",
        headers,
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new UpstreamServiceError(detailMessage(body.detail), response.status);
    }

    return response.json() as Promise<T>;
}

/* FastAPI's `detail`: a string when the service raises, a list on a 422. */
function detailMessage(detail: unknown): string {
    if (typeof detail === "string") {
        return detail;
    }
    if (Array.isArray(detail) && detail.length > 0 && typeof detail[0]?.msg === "string") {
        return detail[0].msg;
    }
    return "technical-debt-service request failed.";
}

function debtPath(owner: string, repo: string, suffix = ""): string {
    return `/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/debt${suffix}`;
}

/*
The part of technical-debt-service's summary this gateway reads. `debt_ratio`
and the rest are forwarded untouched to the dashboard; only these fields are
needed to attribute debt to the person who opened the pull request.
*/
export interface DebtReviewSummary {
    pull_request_number: number;
    total_debt_minutes: number;
    created_at: string;
}

export interface DebtSummary {
    pull_requests?: DebtReviewSummary[];
}

export class TechnicalDebtServiceClient {

    /* Every figure on the debt dashboard, for one repository. */
    async getSummary(owner: string, repo: string, userId?: string): Promise<unknown> {
        return request(debtPath(owner, repo, "/summary"), { userId });
    }

    /*
    The same summary, typed for the contributors join, and null rather than
    throwing when there is none.

    A repository whose debt has never been calculated answers 404, and that
    is not an error on the contributors page — it means "not measured yet",
    which is exactly what the page already knows how to show. Any other
    failure is also swallowed: contributors is a page about pull requests
    and lines, and it should not go blank because a second service is down.
    */
    async getSummaryForAttribution(
        owner: string,
        repo: string,
        userId?: string
    ): Promise<DebtSummary | null> {
        try {
            return await request<DebtSummary>(debtPath(owner, repo, "/summary"), { userId });
        } catch {
            return null;
        }
    }

    async listReviews(
        owner: string,
        repo: string,
        limit?: number,
        userId?: string
    ): Promise<unknown> {
        const query = limit === undefined ? "" : `?limit=${encodeURIComponent(limit)}`;
        return request(debtPath(owner, repo) + query, { userId });
    }

    async getPullRequestDebt(
        owner: string,
        repo: string,
        pullRequestNumber: number,
        userId?: string
    ): Promise<unknown> {
        return request(
            debtPath(owner, repo, `/pull-requests/${pullRequestNumber}`),
            { userId }
        );
    }

    /*
    Spends money: two LLM calls per finding. Slow enough that the caller
    should expect to wait, and the reason the debt dashboard disables its
    button while one is running.
    */
    async calculatePullRequestDebt(
        owner: string,
        repo: string,
        pullRequestNumber: number,
        userId?: string
    ): Promise<unknown> {
        return request(
            debtPath(owner, repo, `/pull-requests/${pullRequestNumber}/calculate`),
            { method: "POST", userId }
        );
    }
}
