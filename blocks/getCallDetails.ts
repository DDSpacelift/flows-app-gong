import { AppBlock, events, kv } from "@slflows/sdk/v1";
import { callGongApi } from "../gongClient.ts";

export const getCallDetails: AppBlock = {
  name: "Get Call Details",
  description:
    "Retrieves detailed information about a specific call, including participants, duration, metadata, and recording status.",
  category: "Calls & Recordings",

  inputs: {
    default: {
      name: "Get Details",
      description: "Trigger retrieving call details",
      config: {
        callId: {
          name: "Call ID",
          description: "The unique identifier of the call to retrieve",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { callId } = input.event.inputConfig;

        // Get tokens from app config
        const accessToken = await kv.app.get("oauth_access_token");
        const refreshToken = await kv.app.get("oauth_refresh_token");

        if (!accessToken?.value || !refreshToken?.value) {
          throw new Error(
            "App not authenticated. Please complete OAuth setup.",
          );
        }

        const apiConfig = {
          accessToken: accessToken.value,
          refreshToken: refreshToken.value,
          clientId: input.app.config.clientId as string,
          clientSecret: input.app.config.clientSecret as string,
          baseUrl:
            (input.app.config.baseUrl as string) || "https://api.gong.io",
        };

        const callData = await callGongApi(`/calls/${callId}`, apiConfig);

        await events.emit({
          id: callData.id,
          title: callData.title,
          scheduled: callData.scheduled,
          started: callData.started,
          duration: callData.duration,
          primaryUserId: callData.primaryUserId,
          direction: callData.direction,
          system: callData.system,
          scope: callData.scope,
          media: callData.media,
          language: callData.language,
          workspaceId: callData.workspaceId,
          parties: callData.parties,
          content: callData.content,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Call Details",
      description: "Emits the complete call details object",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          id: { type: "string", description: "Call identifier" },
          title: { type: "string", description: "Call title/subject" },
          scheduled: {
            type: "string",
            description: "Scheduled start time (ISO 8601)",
          },
          started: {
            type: "string",
            description: "Actual start time (ISO 8601)",
          },
          duration: { type: "number", description: "Duration in seconds" },
          primaryUserId: {
            type: "string",
            description: "Gong user who owns the call",
          },
          direction: {
            type: "string",
            description: "Call direction (inbound/outbound/conference)",
          },
          system: {
            type: "string",
            description: "Source system (Zoom, Teams, etc.)",
          },
          scope: { type: "string", description: "Public/private scope" },
          media: {
            type: "string",
            description: "Recording availability status",
          },
          language: { type: "string", description: "Detected language" },
          workspaceId: { type: "string", description: "Workspace identifier" },
          parties: {
            type: "array",
            description: "Array of participants",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                affiliation: { type: "string" },
              },
            },
          },
          content: {
            type: "object",
            description: "Content metadata (topics, trackers, etc.)",
          },
        },
        required: ["id", "title"],
      },
    },
  },
};
