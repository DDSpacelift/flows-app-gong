import { AppBlock, events } from "@slflows/sdk/v1";
import { callGongApi } from "../gongClient";
import {
  gongCallIdSchema,
  gongCallSchema,
  gongParticipantSchema,
  gongTranscriptSentenceSchema,
} from "../jsonschema/jsonschema";

export const searchCalls: AppBlock = {
  name: "Search Calls",
  description:
    "Searches for calls in Gong with flexible filtering options. Returns paginated call data including metadata, participants, call duration, and basic call information.",
  category: "Calls",

  inputs: {
    default: {
      name: "Search",
      description: "Trigger a call search with the specified filters.",
      config: {
        fromDateTime: {
          name: "From Date/Time",
          description:
            "Start date/time in ISO 8601 format (e.g., '2025-01-01T00:00:00Z')",
          type: "string",
          required: false,
        },
        toDateTime: {
          name: "To Date/Time",
          description:
            "End date/time in ISO 8601 format (e.g., '2025-01-31T23:59:59Z')",
          type: "string",
          required: false,
        },
        workspaceId: {
          name: "Workspace ID",
          description: "Filter calls by specific workspace ID",
          type: "string",
          required: false,
        },
        cursor: {
          name: "Cursor",
          description:
            "Pagination cursor from previous response for fetching next page",
          type: "string",
          required: false,
        },
      },
      async onEvent(input) {
        const { accessKey, accessKeySecret, apiBaseUrl } = input.app.config;
        const { fromDateTime, toDateTime, workspaceId, cursor } =
          input.event.inputConfig;

        if (!accessKey || !accessKeySecret) {
          throw new Error(
            "Gong credentials not configured. Cannot search calls.",
          );
        }

        const requestBody: any = {
          filter: {},
        };

        if (fromDateTime) {
          requestBody.filter.fromDateTime = fromDateTime;
        }
        if (toDateTime) {
          requestBody.filter.toDateTime = toDateTime;
        }
        if (workspaceId) {
          requestBody.filter.workspaceIds = [workspaceId];
        }
        if (cursor) {
          requestBody.cursor = cursor;
        }

        const response = await callGongApi(
          "v2/calls",
          accessKey as string,
          accessKeySecret as string,
          (apiBaseUrl as string) || "https://api.gong.io",
          {
            method: "POST",
            body: requestBody,
          },
        );

        await events.emit({
          calls: response.calls || [],
          cursor: response.records?.cursor,
          totalRecords: response.records?.totalRecords,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Search Results",
      description: "Emitted when call search completes successfully.",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          calls: {
            type: "array",
            description: "Array of calls matching the search criteria",
            items: gongCallSchema,
          },
          cursor: {
            type: "string",
            description:
              "Cursor for fetching the next page (undefined if no more results)",
          },
          totalRecords: {
            type: "number",
            description: "Total number of records matching the search",
          },
        },
        required: ["calls"],
      },
    },
  },
};

export const getCallDetails: AppBlock = {
  name: "Get Call Details",
  description:
    "Retrieves comprehensive information about a specific call, including topics, questions asked, action items, sentiment analysis, call structure, and participant details.",
  category: "Calls",

  inputs: {
    default: {
      name: "Get Details",
      description: "Trigger retrieving call details for the specified call ID.",
      config: {
        callId: {
          name: "Call ID",
          description: "The unique identifier of the call to retrieve",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { accessKey, accessKeySecret, apiBaseUrl } = input.app.config;
        const { callId } = input.event.inputConfig;

        if (!accessKey || !accessKeySecret) {
          throw new Error(
            "Gong credentials not configured. Cannot get call details.",
          );
        }

        const response = await callGongApi(
          `v2/calls/${callId}`,
          accessKey as string,
          accessKeySecret as string,
          (apiBaseUrl as string) || "https://api.gong.io",
          {
            method: "GET",
          },
        );

        await events.emit({
          call: response.call,
          context: response.context,
          content: response.content,
          parties: response.parties,
          structure: response.structure,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Call Details",
      description:
        "Emitted when call details have been successfully retrieved.",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          call: {
            ...gongCallSchema,
            description: "Basic call information",
          },
          context: {
            type: "object",
            description:
              "Context information including CRM objects and custom fields",
          },
          content: {
            type: "object",
            description:
              "Content analysis including topics, trackers, questions, action items",
            properties: {
              topics: {
                type: "array",
                description: "Topics discussed in the call",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    duration: { type: "number" },
                  },
                },
              },
              pointsOfInterest: {
                type: "array",
                description: "Notable moments in the call",
                items: { type: "object" },
              },
              actionItems: {
                type: "array",
                description: "Action items identified in the call",
                items: { type: "object" },
              },
            },
          },
          parties: {
            type: "array",
            description: "Participants in the call",
            items: gongParticipantSchema,
          },
          structure: {
            type: "object",
            description:
              "Call structure including speaker time and interactions",
          },
        },
        required: ["call"],
      },
    },
  },
};

export const getCallTranscript: AppBlock = {
  name: "Get Call Transcript",
  description:
    "Retrieves the full transcript of a specific call with timestamps, speaker attribution, and sentence-level segmentation.",
  category: "Calls",

  inputs: {
    default: {
      name: "Get Transcript",
      description:
        "Trigger retrieving the transcript for the specified call ID.",
      config: {
        callId: {
          name: "Call ID",
          description: "The unique identifier of the call",
          type: "string",
          required: true,
        },
      },
      async onEvent(input) {
        const { accessKey, accessKeySecret, apiBaseUrl } = input.app.config;
        const { callId } = input.event.inputConfig;

        if (!accessKey || !accessKeySecret) {
          throw new Error(
            "Gong credentials not configured. Cannot get call transcript.",
          );
        }

        const response = await callGongApi(
          `v2/calls/transcript`,
          accessKey as string,
          accessKeySecret as string,
          (apiBaseUrl as string) || "https://api.gong.io",
          {
            method: "POST",
            body: {
              filter: {
                callIds: [callId],
              },
            },
          },
        );

        // Gong returns transcripts for all requested calls
        const callTranscript = response.callTranscripts?.[0];

        if (!callTranscript) {
          throw new Error(`No transcript found for call ${callId}`);
        }

        await events.emit({
          callId: callTranscript.callId,
          transcript: callTranscript.transcript || [],
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Transcript",
      description:
        "Emitted when the transcript has been successfully retrieved.",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          callId: gongCallIdSchema,
          transcript: {
            type: "array",
            description:
              "Array of transcript sentences with speaker and timing information",
            items: gongTranscriptSentenceSchema,
          },
        },
        required: ["callId", "transcript"],
      },
    },
  },
};
