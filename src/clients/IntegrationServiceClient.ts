import { env } from "../config/env";
import { UpstreamServiceError } from "../errors/UpstreamServiceError";

/*
Thin HTTP wrapper around integration-service.

This is the only file in main-backend that knows integration-service's
{success, data, message} response envelope — everywhere else in this
codebase (ProjectController and friends) returns bare JSON, so unwrapping
happens once, here, rather than leaking that shape into every controller
that happens to call out to this particular service.
*/

interface Envelope<T> {
    success: boolean;
    data?: T;
    message?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {

    const response = await fetch(`${env.integrationServiceUrl}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {})
        }
    });

    const body = (await response.json()) as Envelope<T>;

    if (!response.ok || !body.success) {
        throw new UpstreamServiceError(
            body.message ?? "integration-service request failed.",
            response.status
        );
    }

    return body.data as T;
}

export interface IntegrationUser {
    id: string;
    email: string;
    fullName: string;
    createdAt: string;
    updatedAt: string;
}

export interface RepositoryPreview {
    provider: "github" | "gitlab";
    repositoryUrl: string;
    repository: {
        owner: string;
        name: string;
        description: string | null;
        language: string | null;
        visibility: string;
        stars: number;
        forks: number;
        defaultBranch: string;
        updatedAt: string;
    };
}

export interface Integration {
    id: string;
    userId: string;
    provider: "github" | "gitlab";
    repositoryUrl: string;
    repositoryOwner: string;
    repositoryName: string;
    providerUsername?: string;
    status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED";
    webhookRegistered: boolean;
    createdAt: string;
    updatedAt: string;
}

export class IntegrationServiceClient {

    createOrFindUser(email: string, fullName: string): Promise<IntegrationUser> {
        return request<IntegrationUser>("/api/users", {
            method: "POST",
            body: JSON.stringify({ email, fullName })
        });
    }

    previewRepository(url: string): Promise<RepositoryPreview> {
        return request<RepositoryPreview>(
            `/api/repositories/preview?url=${encodeURIComponent(url)}`
        );
    }

    authorizeIntegration(
        userId: string,
        repositoryUrl: string
    ): Promise<{ integrationId: string; authorizationUrl: string }> {
        return request("/api/integrations/authorize", {
            method: "POST",
            body: JSON.stringify({ userId, repositoryUrl })
        });
    }

    listIntegrations(userId: string): Promise<Integration[]> {
        return request<Integration[]>(
            `/api/integrations?userId=${encodeURIComponent(userId)}`
        );
    }

    getIntegration(id: string): Promise<Integration> {
        return request<Integration>(`/api/integrations/${id}`);
    }

    async revokeIntegration(id: string): Promise<void> {
        await request(`/api/integrations/${id}`, { method: "DELETE" });
    }

}
