/**
 * IntegrationClient
 * -----------------------------------------------------------------------------
 * The main backend's ONLY way of talking to the integration service. Every
 * request goes through this class so:
 *
 *   - The X-Internal-Api-Key header is set in one place.
 *   - Response handling / error translation lives in one place.
 *   - Tests can substitute a fake client without patching fetch.
 *
 * SOLID:
 *   - SRP: HTTP transport only. No business logic. No user session lookups.
 *   - DIP: exposes methods keyed by what the CALLER wants ("previewRepo"),
 *     not by HTTP endpoint. Route changes on the integration service don't
 *     ripple into caller code.
 */

export interface IntegrationClientOpts {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export interface RepositoryPreviewDTO {
  target: {
    platform: "github" | "gitlab";
    kind: "repository" | "organization";
    owner: string;
    repo?: string;
    hostBaseUrl: string;
  };
  name?: string;
  fullName?: string;
  description?: string | null;
  primaryLanguage?: string | null;
  languages?: string[];
  contributorsCount?: number | null;
  lastUpdatedAt?: string | null;
  isPrivate?: boolean;
  ownerAvatarUrl?: string;
  repositoryListSample?: { name: string; fullName: string }[];
  degraded: boolean;
}

export class IntegrationClient {
  private readonly fetch: typeof fetch;

  constructor(private readonly opts: IntegrationClientOpts) {
    this.fetch = opts.fetchImpl ?? fetch;
  }

  async previewRepo(url: string): Promise<RepositoryPreviewDTO> {
    const res = await this.post("/repos/preview", { url });
    return (res as { preview: RepositoryPreviewDTO }).preview;
  }

  async startOAuth(input: {
    platform: "github" | "gitlab";
    userId: string;
    target?: RepositoryPreviewDTO["target"];
    returnTo?: string;
    redirectUri: string;
  }): Promise<{ authorizationUrl: string; state: string; expiresAt: string }> {
    return (await this.post(`/oauth/${input.platform}/start`, {
      userId: input.userId,
      target: input.target,
      returnTo: input.returnTo,
      redirectUri: input.redirectUri,
    })) as { authorizationUrl: string; state: string; expiresAt: string };
  }

  async completeOAuth(input: {
    platform: "github" | "gitlab";
    userId: string;
    code: string;
    state: string;
    redirectUri: string;
  }): Promise<{ integrationId: string; externalUserLogin: string; returnTo?: string }> {
    return (await this.post(`/oauth/${input.platform}/complete`, {
      userId: input.userId,
      code: input.code,
      state: input.state,
      redirectUri: input.redirectUri,
    })) as { integrationId: string; externalUserLogin: string; returnTo?: string };
  }

  async connectRepo(input: {
    userId: string;
    integrationId: string;
    target: RepositoryPreviewDTO["target"];
    deliveryUrl: string;
    events?: string[];
  }): Promise<{
    integration: { integrationId: string; webhookExternalId: string; status: "connected" };
  }> {
    return (await this.post("/repos/connect", input)) as {
      integration: {
        integrationId: string;
        webhookExternalId: string;
        status: "connected";
      };
    };
  }

  // -----------------------------------------------------------------------

  private async post(path: string, body: unknown): Promise<unknown> {
    const res = await this.fetch(`${this.opts.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-api-key": this.opts.apiKey,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text.length ? JSON.parse(text) : null;
    } catch {
      // fall through, we'll throw below
    }
    if (!res.ok) {
      const asObj =
        typeof parsed === "object" && parsed !== null
          ? (parsed as Record<string, unknown>)
          : {};
      throw new IntegrationClientError(
        (asObj.message as string) ?? `integration-service ${res.status}`,
        res.status,
        (asObj.code as string) ?? "integration_error",
        asObj,
      );
    }
    return parsed;
  }
}

export class IntegrationClientError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "IntegrationClientError";
  }
}
