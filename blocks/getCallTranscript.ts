import { AppBlock, events, kv } from "@slflows/sdk/v1";
import { callGongApi } from "../gongClient.ts";

export const getCallTranscript: AppBlock = {
  name: "Get Call Transcript",
  description:
    "Retrieves the full transcript of a call with speaker identification and timestamps.",
  category: "Transcripts & Analysis",

  inputs: {
    default: {
      name: "Get Transcript",
      description: "Trigger retrieving call transcript",
      config: {
        callId: {
          name: "Call ID",
          description: "The unique identifier of the call",
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

        const transcriptData = await callGongApi(
          `/calls/${callId}/transcript`,
          apiConfig,
        );

        await events.emit({
          callId,
          transcript: transcriptData.transcript || [],
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Transcript",
      description: "Emits the call transcript with speaker information",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          callId: { type: "string", description: "The call identifier" },
          transcript: {
            type: "array",
            description: "Array of transcript entries",
            items: {
              type: "object",
              properties: {
                speakerId: {
                  type: "string",
                  description: "Speaker identifier",
                },
                topic: {
                  type: "string",
                  description: "Current topic/segment",
                },
                sentences: {
                  type: "array",
                  description: "Array of sentences",
                  items: {
                    type: "object",
                    properties: {
                      start: {
                        type: "number",
                        description: "Start time in seconds",
                      },
                      end: {
                        type: "number",
                        description: "End time in seconds",
                      },
                      text: { type: "string", description: "Transcript text" },
                    },
                  },
                },
              },
            },
          },
        },
        required: ["callId", "transcript"],
      },
    },
  },
};
