/**
 * @deprecated Prefer importing from `shared-contracts` directly. Kept for short internal paths.
 */
export type { ConversationThreadState as ThreadState } from "../../shared-contracts/enums.js";
export {
  CONVERSATION_THREAD_STATE,
  CONVERSATION_THREAD_STATES,
  PROCESSABLE_THREAD_STATES,
  isConversationThreadState,
  isConversationThreadState as isThreadState,
  isProcessableThreadState,
} from "../../shared-contracts/enums.js";

/** @deprecated Use CONVERSATION_THREAD_STATES */
export { CONVERSATION_THREAD_STATES as THREAD_STATES } from "../../shared-contracts/enums.js";
