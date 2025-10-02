/**
 * Block Registry for Gong
 *
 * This file exports all blocks as a dictionary for easy registration.
 */

import { getCallDetails } from "./getCallDetails.ts";
import { searchCalls } from "./searchCalls.ts";
import { getCallTranscript } from "./getCallTranscript.ts";
import {
  newCallSubscription,
  transcriptReadySubscription,
  callAnalyzedSubscription,
} from "./subscriptions.ts";
import { getUserDetails } from "./getUserDetails.ts";

/**
 * Dictionary of all available blocks
 */
export const blocks = {
  getCallDetails,
  searchCalls,
  getCallTranscript,
  newCallSubscription,
  transcriptReadySubscription,
  callAnalyzedSubscription,
  getUserDetails,
} as const;

// Named exports for individual blocks
export {
  getCallDetails,
  searchCalls,
  getCallTranscript,
  newCallSubscription,
  transcriptReadySubscription,
  callAnalyzedSubscription,
  getUserDetails,
};
