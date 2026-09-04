import { env } from "../config/env";
import { UpstreamServiceError } from "../errors/UpstreamServiceError";

/*
Thin HTTP wrapper around analysis-engine's read API. Unlike
IntegrationServiceClient, analysis-engine returns bare JSON already (no
{success, data} envelope), so there's nothing to unwrap here — this class
exists purely to keep "which service, which URL" out of the controllers.
*/

async function request<T>(path: string): Promise<T> {

    const response = await fetch(`${env.analysisEngineUrl}${path}`);

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new UpstreamServiceError(
            body.detail ?? "analysis-engine request failed.",
            response.status
        );
    }

    return response.json() as Promise<T>;
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

    getPullRequestAnalysis(
        owner: string,
        repo: string,
        pullRequestNumber: number
    ): Promise<AnalysisResult> {
        return request(
            `/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/analysis/pull-requests/${pullRequestNumber}`
        );
    }

}
