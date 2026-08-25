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

export interface AnalysisResult {
    result_id: string;
    job_id: string;
    repository: string;
    pull_request_number: number;
    commit_sha: string;
    status: "completed" | "failed";
    findings: Finding[];
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
