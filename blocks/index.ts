/**
 * Block Registry for Gong App
 *
 * This file exports all blocks as a dictionary for easy registration.
 */

import { searchCalls, getCallDetails, getCallTranscript } from "./calls";
import { getUserDetails } from "./users";
import {
  newCallSubscription,
  transcriptReadySubscription,
  callAnalyzedSubscription,
} from "./subscriptions";

/**
 * Dictionary of all available blocks
 */
export const blocks = {
  // Call retrieval
  searchCalls,
  getCallDetails,
  getCallTranscript,

  // User management
  getUserDetails,

  // Webhook subscriptions
  newCallSubscription,
  transcriptReadySubscription,
  callAnalyzedSubscription,
} as const;

// Named exports for individual blocks
export {
  searchCalls,
  getCallDetails,
  getCallTranscript,
  getUserDetails,
  newCallSubscription,
  transcriptReadySubscription,
  callAnalyzedSubscription,
};
