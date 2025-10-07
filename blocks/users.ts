import { AppBlock, events } from "@slflows/sdk/v1";
import { callGongApi } from "../gongClient";
import { gongUserSchema } from "../jsonschema/jsonschema";

export const getUserDetails: AppBlock = {
  name: "Get User Details",
  description:
    "Retrieves detailed information about a specific Gong user including their profile, email, role, and settings.",
  category: "Users",

  inputs: {
    default: {
      name: "Get User",
      description: "Trigger retrieving user details for the specified user ID.",
      config: {
        userId: {
          name: "User ID",
          description: "The unique identifier of the user",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { accessKey, accessKeySecret, apiBaseUrl } = input.app.config;
        const { userId } = input.event.inputConfig;

        if (!accessKey || !accessKeySecret) {
          throw new Error(
            "Gong credentials not configured. Cannot get user details.",
          );
        }

        const response = await callGongApi(
          `v2/users`,
          accessKey as string,
          accessKeySecret as string,
          (apiBaseUrl as string) || "https://api.gong.io",
          {
            method: "GET",
            params: {
              ids: userId,
            },
          },
        );

        // Gong returns users for all requested IDs
        const user = response.users?.[0];

        if (!user) {
          throw new Error(`No user found with ID ${userId}`);
        }

        await events.emit({
          user,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "User Details",
      description:
        "Emitted when user details have been successfully retrieved.",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          user: gongUserSchema,
        },
        required: ["user"],
      },
    },
  },
};
