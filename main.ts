import { defineApp, lifecycle, http, kv, messaging } from "@slflows/sdk/v1";
import { blocks } from "./blocks/index.ts";
import { exchangeCodeForTokens, callGongApi } from "./gongClient.ts";
import {
  verifyWebhookSignature,
  extractWebhookSignature,
} from "./webhookHelpers.ts";

export const app = defineApp({
  name: "Gong",
  installationInstructions:
    "Integrate with Gong's revenue intelligence platform to automate sales call analysis, transcripts, and insights.\n\nTo install:\n1. Enter your Gong OAuth Client ID and Client Secret\n2. Leave the Gong API Base URL as default (https://api.gong.io) or use https://eu-api.gong.io for EU instances\n3. Follow the OAuth authorization flow\n4. Optionally configure webhook secret for real-time events",

  config: {
    clientId: {
      name: "OAuth Client ID",
      description: "OAuth client ID from your Gong app configuration",
      type: "string",
      required: true,
      sensitive: false,
    },
    clientSecret: {
      name: "OAuth Client Secret",
      description: "OAuth client secret from your Gong app configuration",
      type: "string",
      required: true,
      sensitive: true,
    },
    accessToken: {
      name: "Access Token",
      description: "OAuth access token (automatically populated)",
      type: "string",
      required: false,
      sensitive: true,
    },
    refreshToken: {
      name: "Refresh Token",
      description: "OAuth refresh token for renewing access tokens",
      type: "string",
      required: false,
      sensitive: true,
    },
    baseUrl: {
      name: "Gong API Base URL",
      description:
        "Base URL for Gong API (use https://api.gong.io or https://eu-api.gong.io for EU)",
      type: "string",
      required: false,
      default: "https://api.gong.io",
    },
    webhookSecret: {
      name: "Webhook Secret",
      description: "Secret token for verifying incoming webhooks from Gong",
      type: "string",
      required: false,
      sensitive: true,
    },
  },

  signals: {
    userId: {
      name: "User ID",
      description: "The Gong user ID associated with the authenticated account",
    },
    workspaceId: {
      name: "Workspace ID",
      description: "The Gong workspace ID for this installation",
    },
  },

  blocks,

  async onSync(input) {
    const { clientId, clientSecret, accessToken, refreshToken, baseUrl } =
      input.app.config;

    // Check if prompt exists
    const promptExists = "oauth_prompt_id" in input.app.prompts;

    // Check for authorization code in KV storage (from OAuth callback)
    const authCodePair = await kv.app.get("oauth_auth_code");

    if (authCodePair?.value) {
      // Exchange authorization code for tokens
      try {
        const redirectUri = `${input.app.http.url}/oauth/callback`;
        const tokens = await exchangeCodeForTokens(
          authCodePair.value,
          clientId as string,
          clientSecret as string,
          redirectUri,
        );

        // Store tokens in app config
        await kv.app.setMany([
          { key: "oauth_access_token", value: tokens.accessToken },
          { key: "oauth_refresh_token", value: tokens.refreshToken },
        ]);

        // Clear the authorization code
        await kv.app.delete(["oauth_auth_code"]);

        // Delete OAuth prompt if exists
        if (promptExists) {
          await lifecycle.prompt.delete("oauth_prompt_id");
        }

        // Trigger another sync to validate tokens
        await lifecycle.sync();
        return {
          newStatus: "in_progress",
          customStatusDescription: "Validating tokens",
        };
      } catch (error: any) {
        console.error("Token exchange failed:", error);
        return {
          newStatus: "failed",
          customStatusDescription: "Token exchange failed",
        };
      }
    }

    // Check if we have tokens (either from config or KV)
    const storedAccessToken = await kv.app.get("oauth_access_token");
    const storedRefreshToken = await kv.app.get("oauth_refresh_token");

    const finalAccessToken =
      (accessToken as string) || storedAccessToken?.value;
    const finalRefreshToken =
      (refreshToken as string) || storedRefreshToken?.value;

    if (finalAccessToken && finalRefreshToken) {
      // Validate token by calling Gong API
      try {
        // Ensure correct API base URL (not app.gong.io)
        let apiBaseUrl = (baseUrl as string) || "https://api.gong.io";
        if (apiBaseUrl.includes("app.gong.io")) {
          apiBaseUrl = apiBaseUrl.replace("app.gong.io", "api.gong.io");
        }

        const apiConfig = {
          accessToken: finalAccessToken,
          refreshToken: finalRefreshToken,
          clientId: clientId as string,
          clientSecret: clientSecret as string,
          baseUrl: apiBaseUrl,
        };

        // List users to validate token
        const usersResponse = await callGongApi("/users", apiConfig, {
          method: "GET",
        });

        // Extract user info from response
        const users = usersResponse.users || [];
        const currentUser = users.length > 0 ? users[0] : null;

        if (currentUser) {
          // Delete OAuth prompt if exists
          if (promptExists) {
            await lifecycle.prompt.delete("oauth_prompt_id");
          }

          return {
            newStatus: "ready",
            signalUpdates: {
              userId: currentUser.id || null,
              workspaceId: currentUser.workspaceId || null,
            },
          };
        } else {
          return {
            newStatus: "failed",
            customStatusDescription: "No user found",
          };
        }
      } catch (error: any) {
        console.error("Token validation failed:", error);
        return {
          newStatus: "failed",
          customStatusDescription: "Auth validation failed",
        };
      }
    }

    // No tokens, need to start OAuth flow
    const redirectUri = `${input.app.http.url}/oauth/callback`;
    const scopes = [
      "api:calls:read:basic",
      "api:calls:read:extensive",
      "api:calls:read:media",
      "api:users:read",
      "api:crm:read",
    ].join(" ");

    const authUrl = `https://app.gong.io/oauth2/authorize?client_id=${encodeURIComponent(
      clientId as string,
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;

    const promptDescription = `
To complete Gong integration:
1. Click "Authorize Gong" below to open the OAuth authorization page
2. Sign in to your Gong account and approve the requested permissions
3. You'll be redirected back automatically
4. The app will complete setup and become ready
`;

    if (!promptExists) {
      await lifecycle.prompt.create("oauth_prompt_id", promptDescription, {
        redirect: {
          url: authUrl,
          method: "GET",
        },
      });
    }

    return {
      newStatus: "in_progress",
      customStatusDescription: "Awaiting OAuth authorization",
    };
  },

  http: {
    async onRequest(input) {
      const requestPath = input.request.path;

      // Handle OAuth callback
      if (
        requestPath === "/oauth/callback" ||
        requestPath.endsWith("/oauth/callback")
      ) {
        const query = input.request.query || {};
        const code = query.code;
        const error = query.error;

        if (error) {
          await http.respond(input.request.requestId, {
            statusCode: 400,
            body: { error: "OAuth authorization failed", details: error },
          });
          return;
        }

        if (!code) {
          await http.respond(input.request.requestId, {
            statusCode: 400,
            body: { error: "No authorization code provided" },
          });
          return;
        }

        // Store authorization code in KV for onSync to process
        await kv.app.set({ key: "oauth_auth_code", value: code });

        // Trigger sync to exchange code for tokens
        await lifecycle.sync();

        await http.respond(input.request.requestId, {
          statusCode: 200,
          body: {
            message: "Authorization successful! The app is completing setup...",
          },
        });
        return;
      }

      // Handle webhooks
      if (requestPath === "/webhook" || requestPath.endsWith("/webhook")) {
        const { webhookSecret } = input.app.config;

        if (!webhookSecret) {
          console.error("Webhook received but no webhook secret configured");
          await http.respond(input.request.requestId, {
            statusCode: 500,
            body: { error: "Webhook secret not configured" },
          });
          return;
        }

        // Verify webhook signature
        const signature = extractWebhookSignature(input.request.headers);
        if (!signature) {
          console.warn("Webhook received without signature");
          await http.respond(input.request.requestId, {
            statusCode: 403,
            body: { error: "Missing webhook signature" },
          });
          return;
        }

        const bodyString =
          typeof input.request.body === "string"
            ? input.request.body
            : JSON.stringify(input.request.body);

        const isValid = verifyWebhookSignature(
          bodyString,
          signature,
          webhookSecret as string,
        );

        if (!isValid) {
          console.warn("Invalid webhook signature");
          await http.respond(input.request.requestId, {
            statusCode: 403,
            body: { error: "Invalid webhook signature" },
          });
          return;
        }

        // Parse webhook payload
        const payload =
          typeof input.request.body === "string"
            ? JSON.parse(input.request.body)
            : input.request.body;

        // Route webhook to subscription blocks
        await routeWebhookToBlocks(payload);

        await http.respond(input.request.requestId, {
          statusCode: 200,
          body: { message: "Webhook received" },
        });
        return;
      }

      // Unknown path
      await http.respond(input.request.requestId, {
        statusCode: 404,
        body: { error: "Endpoint not found" },
      });
    },
  },
});

/**
 * Routes webhook events to subscription blocks based on event type.
 */
async function routeWebhookToBlocks(payload: any): Promise<void> {
  const eventType = payload.eventType || payload.type;

  // Map event types to block subscription keys
  const eventTypeMapping: Record<string, string> = {
    call_created: "new_call_subscription",
    transcript_ready: "transcript_ready_subscription",
    call_analyzed: "call_analyzed_subscription",
  };

  const subscriptionKey = eventTypeMapping[eventType];
  if (!subscriptionKey) {
    console.log(`Unknown webhook event type: ${eventType}`);
    return;
  }

  // Find all blocks subscribed to this event type
  const subscriptionsList = await kv.app.list({
    keyPrefix: `webhook_subscription:${subscriptionKey}:`,
  });

  for (const pair of subscriptionsList.pairs) {
    const blockId = pair.key.split(":")[2];
    if (blockId) {
      // Send internal message to the block
      await messaging.sendToBlocks({
        blockIds: [blockId],
        body: {
          type: "gong_webhook",
          eventType,
          payload,
        },
      });
    }
  }
}
