import type { ConversationThread, Outreach, YesNoClassification } from "../domain/models.js";
import { classifyYesNoReply } from "../domain/classify-yes-no.js";
import { CONVERSATION_THREAD_STATE } from "../../shared-contracts/index.js";

export type ProcessYesNoReplyResult =
  | { ok: true; classification: YesNoClassification }
  | { ok: false; reason: "wrong_thread_state" };

/**
 * Interprets a user reply when the thread expects a yes/no answer.
 * Side effects (Firestore, WhatsApp) are handled by the caller.
 */
export function processYesNoReply(
  thread: ConversationThread,
  outreach: Outreach,
  messageText: string,
): ProcessYesNoReplyResult {
  void outreach;
  if (thread.state !== CONVERSATION_THREAD_STATE.AWAITING_YES_NO) {
    return { ok: false, reason: "wrong_thread_state" };
  }
  return { ok: true, classification: classifyYesNoReply(messageText) };
}
