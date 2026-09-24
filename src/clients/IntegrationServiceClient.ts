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

async function request<T>(path: string, init?: RequestInit & { userId?: string }): Promise<T> {

    const response = await fetch(`${env.integrationServiceUrl}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            // Who is asking, from main-backend's verified session.
            // integration-service decides what they may see or change from
            // their membership and role; browser headers are never
            // forwarded, so nobody can act as someone else.
            ...(init?.userId ? { "X-User-Id": init.userId } : {}),
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

    /**
     * Whether this user belongs to an organization that has connected
     * this repository. 404 from integration-service means "no", which is
     * an answer rather than a failure — hence the explicit status check
     * instead of letting `request` throw.
     */
    async canAccessRepository(userId: string, owner: string, repo: string): Promise<boolean> {
        const query = new URLSearchParams({ owner, repo, provider: "github" });

        const response = await fetch(
            `${env.integrationServiceUrl}/api/integrations/access?${query}`,
            { headers: { "Content-Type": "application/json", "X-User-Id": userId } }
        );

        if (response.status === 404) return false;
        if (!response.ok) {
            throw new UpstreamServiceError("integration-service access check failed.", response.status);
        }
        return true;
    }

    /**
     * Creates an account, or claims one an admin added by email but nobody
     * has set a password on yet.
     */
    registerUser(email: string, fullName: string, password: string): Promise<IntegrationUser> {
        return request<IntegrationUser>("/api/users/register", {
            method: "POST",
            body: JSON.stringify({ email, fullName, password })
        });
    }

    /** The user behind these credentials; throws 401 upstream if they don't match. */
    authenticateUser(email: string, password: string): Promise<IntegrationUser> {
        return request<IntegrationUser>("/api/users/authenticate", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
    }

    previewRepository(url: string): Promise<RepositoryPreview> {
        return request<RepositoryPreview>(
            `/api/repositories/preview?url=${encodeURIComponent(url)}`
        );
    }

    authorizeIntegration(
        userId: string,
        repositoryUrl: string,
        organizationId: string,
        projectId: string | null = null
    ): Promise<{ integrationId: string; authorizationUrl: string }> {
        return request("/api/integrations/authorize", {
            method: "POST",
            body: JSON.stringify({ userId, repositoryUrl, organizationId, projectId })
        });
    }

    /** An organization's connected repositories, or (without one) the caller's own. */
    listIntegrations(userId: string, organizationId?: string, projectId?: string): Promise<Integration[]> {
        const scope = [
            `userId=${encodeURIComponent(userId)}`,
            organizationId ? `organizationId=${encodeURIComponent(organizationId)}` : "",
            projectId ? `projectId=${encodeURIComponent(projectId)}` : ""
        ].filter(Boolean).join("&");

        return request<Integration[]>(
            `/api/integrations?${scope}`,
            { userId }
        );
    }

    getIntegration(id: string): Promise<Integration> {
        return request<Integration>(`/api/integrations/${id}`);
    }

    async revokeIntegration(id: string): Promise<void> {
        await request(`/api/integrations/${id}`, { method: "DELETE" });
    }

}

// ---------------------------------------------------------------------
// Multi-tenancy: organizations, their members and their projects
// (integration-service owns users, so it owns these too).
// ---------------------------------------------------------------------

export type OrganizationRole = "ADMIN" | "MANAGER" | "DEVELOPER";

export interface Organization {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    updatedAt: string;
}

export interface OrganizationMembership {
    organization: Organization;
    role: OrganizationRole;
}

export interface Project {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    repositories?: Array<{
        integrationId: string;
        provider: "github" | "gitlab";
        repositoryOwner: string;
        repositoryName: string;
        status: string;
    }>;
}

export class OrganizationServiceClient {

    listOrganizations(userId: string): Promise<OrganizationMembership[]> {
        return request(`/api/organizations`, { userId });
    }

    createOrganization(userId: string, name: string): Promise<Organization> {
        return request(`/api/organizations`, { method: "POST", body: JSON.stringify({ name }), userId });
    }

    getOrganization(userId: string, organizationId: string): Promise<{ organization: Organization; role: OrganizationRole }> {
        return request(`/api/organizations/${encodeURIComponent(organizationId)}`, { userId });
    }

    listMembers(userId: string, organizationId: string): Promise<unknown[]> {
        return request(`/api/organizations/${encodeURIComponent(organizationId)}/members`, { userId });
    }

    addMember(userId: string, organizationId: string, body: unknown): Promise<unknown> {
        return request(`/api/organizations/${encodeURIComponent(organizationId)}/members`,
            { method: "POST", body: JSON.stringify(body), userId });
    }

    changeMemberRole(userId: string, organizationId: string, memberUserId: string, body: unknown): Promise<void> {
        return request(`/api/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberUserId)}`,
            { method: "PATCH", body: JSON.stringify(body), userId });
    }

    removeMember(userId: string, organizationId: string, memberUserId: string): Promise<void> {
        return request(`/api/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberUserId)}`,
            { method: "DELETE", userId });
    }

    listProjects(userId: string, organizationId: string): Promise<Project[]> {
        return request(`/api/organizations/${encodeURIComponent(organizationId)}/projects`, { userId });
    }

    createProject(userId: string, organizationId: string, body: unknown): Promise<Project> {
        return request(`/api/organizations/${encodeURIComponent(organizationId)}/projects`,
            { method: "POST", body: JSON.stringify(body), userId });
    }

    updateProject(userId: string, organizationId: string, projectId: string, body: unknown): Promise<Project> {
        return request(`/api/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}`,
            { method: "PATCH", body: JSON.stringify(body), userId });
    }

    deleteProject(userId: string, organizationId: string, projectId: string): Promise<void> {
        return request(`/api/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}`,
            { method: "DELETE", userId });
    }

    assignRepository(userId: string, organizationId: string, integrationId: string, projectId: string | null): Promise<void> {
        return request(
            `/api/organizations/${encodeURIComponent(organizationId)}/repositories/${encodeURIComponent(integrationId)}/project`,
            { method: "PUT", body: JSON.stringify({ projectId }), userId }
        );
    }
}
