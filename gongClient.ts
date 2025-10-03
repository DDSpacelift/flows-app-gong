import { kv } from "@slflows/sdk/v1";

export interface GongApiConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

/**
 * Calls the Gong API with automatic token refresh on 401.
 */
export async function callGongApi(
  endpoint: string,
  config: GongApiConfig,
  options: {
    method?: string;
    body?: any;
    queryParams?: Record<string, string>;
  } = {},
): Promise<any> {
  const { method = "GET", body, queryParams } = options;
  const { accessToken, baseUrl } = config;

  let url = `${baseUrl}/v2${endpoint}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // Token expired, attempt refresh
    const newTokens = await refreshGongToken(config);
    if (!newTokens) {
      throw new Error("Failed to refresh Gong access token");
    }

    // Update tokens in app config via KV storage
    await kv.app.set({ key: "accessToken", value: newTokens.accessToken });
    await kv.app.set({ key: "refreshToken", value: newTokens.refreshToken });

    // Retry with new token
    headers.Authorization = `Bearer ${newTokens.accessToken}`;
    const retryResponse = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!retryResponse.ok) {
      const errorText = await retryResponse.text();
      throw new Error(
        `Gong API error after token refresh: ${retryResponse.status} ${errorText}`,
      );
    }

    return retryResponse.json();
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gong API error: ${response.status} ${errorText}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(
      `Gong API returned non-JSON response. URL: ${url}, Content-Type: ${contentType}, Body preview: ${text.substring(0, 200)}`,
    );
  }

  return response.json();
}

/**
 * Refreshes the Gong OAuth access token using the refresh token.
 */
async function refreshGongToken(
  config: GongApiConfig,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const tokenUrl = "https://app.gong.io/oauth2/generate-customer-token";

  // Gong requires Basic Authentication with clientId:clientSecret
  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
    }),
  });

  if (!response.ok) {
    console.error(
      `Token refresh failed: ${response.status} ${await response.text()}`,
    );
    return null;
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || config.refreshToken,
  };
}

/**
 * Exchanges authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenUrl = "https://app.gong.io/oauth2/generate-customer-token";

  // Gong requires Basic Authentication with clientId:clientSecret
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}
