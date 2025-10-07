/**
 * HTTP client for Gong API with Basic Authentication
 */

/**
 * Makes an authenticated API call to Gong
 * @param endpoint - API endpoint path (e.g., "v2/calls")
 * @param accessKey - Gong API access key
 * @param accessKeySecret - Gong API access key secret
 * @param apiBaseUrl - Base URL for Gong API
 * @param options - Additional fetch options
 */
export async function callGongApi(
  endpoint: string,
  accessKey: string,
  accessKeySecret: string,
  apiBaseUrl: string,
  options: {
    method?: string;
    body?: any;
    params?: Record<string, any>;
  } = {},
): Promise<any> {
  const { method = "GET", body, params } = options;

  // Construct URL with query parameters
  let url = `${apiBaseUrl}/${endpoint}`;
  if (params) {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Create Basic Auth header
  const authHeader = `Basic ${Buffer.from(`${accessKey}:${accessKeySecret}`).toString("base64")}`;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gong API error (${method} ${endpoint}): ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  }

  return null;
}
