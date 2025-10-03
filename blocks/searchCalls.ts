import { AppBlock, events, kv } from "@slflows/sdk/v1";
import { callGongApi } from "../gongClient.ts";

export const searchCalls: AppBlock = {
  name: "Search Calls",
  description:
    "Searches for calls based on various criteria like date range, participants, content, or custom filters.",
  category: "Calls & Recordings",

  inputs: {
    default: {
      name: "Search",
      description: "Trigger call search",
      config: {
        fromDateTime: {
          name: "From Date/Time",
          description: "Start of date range (ISO 8601)",
          type: "string",
          required: false,
        },
        toDateTime: {
          name: "To Date/Time",
          description: "End of date range (ISO 8601)",
          type: "string",
          required: false,
        },
        workspaceId: {
          name: "Workspace ID",
          description: "Filter by workspace",
          type: "string",
          required: false,
        },
        primaryUserId: {
          name: "Primary User ID",
          description: "Filter by call owner",
          type: "string",
          required: false,
        },
        cursor: {
          name: "Pagination Cursor",
          description: "Cursor from previous search for pagination",
          type: "string",
          required: false,
        },
      },
      async onEvent(input) {
        const { fromDateTime, toDateTime, workspaceId, primaryUserId, cursor } =
          input.event.inputConfig;

        // Get tokens from app config
        const accessToken = await kv.app.get("oauth_access_token");
        const refreshToken = await kv.app.get("oauth_refresh_token");

        if (!accessToken?.value || !refreshToken?.value) {
          throw new Error(
            "App not authenticated. Please complete OAuth setup.",
          );
        }

        // Ensure correct API base URL (not app.gong.io)
        let apiBaseUrl =
          (input.app.config.baseUrl as string) || "https://api.gong.io";
        if (apiBaseUrl.includes("app.gong.io")) {
          apiBaseUrl = apiBaseUrl.replace("app.gong.io", "api.gong.io");
        }

        const apiConfig = {
          accessToken: accessToken.value,
          refreshToken: refreshToken.value,
          clientId: input.app.config.clientId as string,
          clientSecret: input.app.config.clientSecret as string,
          baseUrl: apiBaseUrl,
        };

        const requestBody: Record<string, any> = {};
        if (fromDateTime) requestBody.fromDateTime = fromDateTime;
        if (toDateTime) requestBody.toDateTime = toDateTime;
        if (workspaceId) requestBody.workspaceId = workspaceId;
        if (primaryUserId) requestBody.primaryUserId = primaryUserId;
        if (cursor) requestBody.cursor = cursor;

        const searchResults = await callGongApi("/calls/extensive", apiConfig, {
          method: "POST",
          body: requestBody,
        });

        await events.emit({
          calls: searchResults.calls || [],
          records: searchResults.records || 0,
          cursor: searchResults.cursor || null,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Search Results",
      description: "Emits search results with calls array and pagination info",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          calls: {
            type: "array",
            description: "Array of call objects matching search criteria",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                started: { type: "string" },
                duration: { type: "number" },
                primaryUserId: { type: "string" },
              },
            },
          },
          records: {
            type: "number",
            description: "Total number of matching calls",
          },
          cursor: {
            type: "string",
            description: "Pagination cursor for next page",
          },
        },
        required: ["calls", "records"],
      },
    },
  },
};
