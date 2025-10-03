import { AppBlock, events, kv } from "@slflows/sdk/v1";
import { callGongApi } from "../gongClient.ts";

export const getUserDetails: AppBlock = {
  name: "Get User Details",
  description: "Retrieves information about a specific Gong user.",
  category: "Users & Teams",

  inputs: {
    default: {
      name: "Get User",
      description: "Trigger retrieving user details",
      config: {
        userId: {
          name: "User ID",
          description: "The unique identifier of the user",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { userId } = input.event.inputConfig;

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

        const userData = await callGongApi(`/users/${userId}`, apiConfig);

        await events.emit({
          id: userData.id,
          emailAddress: userData.emailAddress,
          firstName: userData.firstName,
          lastName: userData.lastName,
          active: userData.active,
          managerId: userData.managerId,
          title: userData.title,
          phoneNumber: userData.phoneNumber,
          extension: userData.extension,
          personalMeetingUrls: userData.personalMeetingUrls || [],
        });
      },
    },
  },

  outputs: {
    default: {
      name: "User Details",
      description: "Emits the user information",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          id: { type: "string", description: "User identifier" },
          emailAddress: { type: "string", description: "User email" },
          firstName: { type: "string", description: "First name" },
          lastName: { type: "string", description: "Last name" },
          active: { type: "boolean", description: "Whether user is active" },
          managerId: { type: "string", description: "Manager's user ID" },
          title: { type: "string", description: "Job title" },
          phoneNumber: { type: "string", description: "Phone number" },
          extension: { type: "string", description: "Extension" },
          personalMeetingUrls: {
            type: "array",
            description: "Array of meeting URLs",
            items: { type: "string" },
          },
        },
        required: ["id", "emailAddress"],
      },
    },
  },
};
