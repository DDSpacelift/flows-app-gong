import { defineApp, http } from "@slflows/sdk/v1";
import { blocks } from "./blocks/index";
import { callGongApi } from "./gongClient";
import { handleGongWebhook, GongWebhookPayload } from "./webhookHelpers";

export const app = defineApp({
  name: "Gong",
  installationInstructions:
    "Gong integration for Spacelift Flows provides read-only access to call data, transcripts, and user information.\n\nTo install:\n1. Obtain your Gong API credentials from Company Settings → Ecosystem → API → API keys\n2. Enter your Access Key and Access Key Secret below\n3. (Optional) Configure webhook URL in Gong to receive real-time call events: use the HTTP URL provided after installation\n4. Confirm the installation",

  blocks,

  config: {
    accessKey: {
      name: "Access Key",
      description:
        "Your Gong API access key. Obtain this from Gong's Company Settings → Ecosystem → API → API keys.",
      type: "string",
      required: true,
      sensitive: true,
    },
    accessKeySecret: {
      name: "Access Key Secret",
      description:
        "Your Gong API access key secret. This is used together with the access key for authentication.",
      type: "string",
      required: true,
      sensitive: true,
    },
    apiBaseUrl: {
      name: "API Base URL",
      description:
        "The base URL for Gong API endpoints. Use the default unless you have a custom deployment.",
      type: "string",
      required: false,
      default: "https://api.gong.io",
    },
  },

  async onSync(input) {
    const { accessKey, accessKeySecret, apiBaseUrl } = input.app.config;

    if (!accessKey || !accessKeySecret) {
      return {
        newStatus: "failed",
        customStatusDescription: "Missing credentials",
      };
    }

    try {
      // Validate credentials by making a test API call to the users endpoint
      await callGongApi(
        "v2/users",
        accessKey as string,
        accessKeySecret as string,
        (apiBaseUrl as string) || "https://api.gong.io",
        {
          method: "GET",
        },
      );

      return {
        newStatus: "ready",
      };
    } catch (error: any) {
      console.error("Gong authentication failed:", error.message);
      return {
        newStatus: "failed",
        customStatusDescription: "Auth failed",
      };
    }
  },

  http: {
    async onRequest(input) {
      const requestPath = input.request.path;

      // Handle webhook events
      if (requestPath === "/webhook" || requestPath.endsWith("/webhook")) {
        try {
          const payload: GongWebhookPayload = input.request.body;

          // Route the webhook to subscribed blocks
          await handleGongWebhook(payload, input.request.requestId);
        } catch (error: any) {
          console.error("Error handling Gong webhook:", error.message);
          await http.respond(input.request.requestId, {
            statusCode: 500,
            body: { error: "Internal error processing webhook" },
          });
        }
      } else {
        // Unknown path
        await http.respond(input.request.requestId, {
          statusCode: 404,
          body: { error: "Endpoint not found" },
        });
      }
    },
  },
});
