import { env } from "../config/env";
import { UpstreamServiceError } from "../errors/UpstreamServiceError";

/*
Thin HTTP wrapper around analysis-engine's read API. Unlike
IntegrationServiceClient, analysis-engine returns bare JSON already (no
{success, data} envelope), so there's nothing to unwrap here — this class
exists purely to keep "which service, which URL" out of the controllers.
*/

async function request<T>(
    path: string,
    init: { method?: string; body?: unknown; userId?: string } = {}
): Promise<T> {

    const headers: Record<string, string> = {};
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    // Who is asking, from main-backend's verified session. analysis-engine
    // trusts this header because only main-backend can reach it.
    if (init.userId) headers["X-User-Id"] = init.userId;

    const response = await fetch(`${env.analysisEngineUrl}${path}`, {
        method: init.method ?? "GET",
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new UpstreamServiceError(detailMessage(body.detail), response.status);
    }

    if (response.status === 204) {
        return undefined as T;
    }
    return response.json() as Promise<T>;
}

/*
FastAPI's `detail` is a string for errors the engine raises itself, and a
list of {loc, msg} objects when request validation fails (422).
*/
function detailMessage(detail: unknown): string {
    if (typeof detail === "string") {
        return detail;
    }
    if (Array.isArray(detail) && detail.length > 0 && typeof detail[0]?.msg === "string") {
        return detail[0].msg;
    }
    return "analysis-engine request failed.";
}

function repoPath(owner: string, repo: string): string {
    return `/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

/* Mirrors analysis-engine's domain/business_rule.py. */
export interface BusinessRule {
    rule_id: string;
    rule: string;
    applies_to: string[];
    severity: "high" | "medium" | "low";
    rationale: string | null;
    source: "repository_file" | "dashboard" | "suggested";
    status: "active" | "suggested" | "rejected";
    evidence: string | null;
}

export interface Finding {
    finding_id: string;
    file_path: string;
    line: number | null;
    column: number | null;
    severity: "error" | "warning" | "info";
    category: string;
    rule_id: string;
    message: string;
    tool: string;
}

/*
Mirrors analysis-engine's domain/metrics.py exactly (field-for-field, same
snake_case) — this client only forwards what analysis-engine already
computed, it never recalculates a density/average/violation count itself.
*/
export interface ComplexityMetrics {
    violations: number;
    maximum: number | null;
    average: number | null;
}

export interface CognitiveComplexityMetrics {
    violations: number;
    maximum: number | null;
    average: number | null;
}

export interface SizeMetrics {
    largest_file_lines: number;
    largest_function_lines: number | null;
    max_lines_violations: number;
    max_lines_per_function_violations: number;
}

export interface UnusedCodeMetrics {
    unused_variables: number;
    unreachable_code: number;
}

export interface AnalysisMetrics {
    files_analyzed: number;
    loc: number;
    errors: number;
    warnings: number;
    total_issues: number;
    error_density: number;
    warning_density: number;
    issue_density: number;
    complexity: ComplexityMetrics;
    cognitive_complexity: CognitiveComplexityMetrics;
    size: SizeMetrics;
    unused_code: UnusedCodeMetrics;
}

export interface RuleStatistic {
    rule_id: string;
    count: number;
    errors: number;
    warnings: number;
}

export interface FileStatistic {
    file_path: string;
    loc: number;
    errors: number;
    warnings: number;
    issues: number;
}

export interface AnalysisResult {
    result_id: string;
    job_id: string;
    repository: string;
    pull_request_number: number;
    commit_sha: string;
    branch: string;
    status: "completed" | "failed";
    findings: Finding[];
    metrics: AnalysisMetrics;
    rule_statistics: RuleStatistic[];
    file_statistics: FileStatistic[];
    started_at: string;
    completed_at: string | null;
    error_message: string | null;
}

export class AnalysisEngineClient {

    listRepositoryAnalysis(
        owner: string,
        repo: string,
        limit = 20
    ): Promise<{ repository: string; results: AnalysisResult[] }> {
        return request(
            `/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/analysis?limit=${limit}`
        );
    }

    listRules(owner: string, repo: string): Promise<{ repository: string; rules: BusinessRule[]; mining: boolean }> {
        return request(`${repoPath(owner, repo)}/rules`);
    }

    addRule(owner: string, repo: string, rule: unknown): Promise<BusinessRule> {
        return request(`${repoPath(owner, repo)}/rules`, { method: "POST", body: rule });
    }

    changeRule(owner: string, repo: string, ruleId: string, change: unknown): Promise<BusinessRule> {
        return request(`${repoPath(owner, repo)}/rules/${encodeURIComponent(ruleId)}`, { method: "PATCH", body: change });
    }

    deleteRule(owner: string, repo: string, ruleId: string): Promise<void> {
        return request(`${repoPath(owner, repo)}/rules/${encodeURIComponent(ruleId)}`, { method: "DELETE" });
    }

    suggestRules(owner: string, repo: string, options: unknown): Promise<{ status: string }> {
        return request(`${repoPath(owner, repo)}/rules/suggest`, { method: "POST", body: options });
    }

    getPullRequestAnalysis(
        owner: string,
        repo: string,
        pullRequestNumber: number,
        userId?: string
    ): Promise<AnalysisResult> {
        return request(
            `/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/analysis/pull-requests/${pullRequestNumber}`,
            { userId }
        );
    }

    giveFeedback(
        owner: string,
        repo: string,
        pullRequestNumber: number,
        fingerprint: string,
        userId: string,
        feedback: unknown
    ): Promise<void> {
        return request(
            `${repoPath(owner, repo)}/analysis/pull-requests/${pullRequestNumber}/review/findings/${encodeURIComponent(fingerprint)}/feedback`,
            { method: "PUT", body: feedback, userId }
        );
    }

    reviewUsage(owner: string, repo: string, days: number): Promise<unknown> {
        return request(`${repoPath(owner, repo)}/review-usage?days=${days}`);
    }

}
