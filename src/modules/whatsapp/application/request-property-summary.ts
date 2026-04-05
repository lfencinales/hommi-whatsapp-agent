import { MSG_REQUEST_PROPERTY_SUMMARY } from "../domain/agent-messages.js";
import type { ConversationThread } from "../domain/models.js";
import type { InboundWhatsAppDeps } from "./ports.js";
import { createLogger } from "../../shared/logger/logger.js";
import { CONVERSATION_THREAD_STATE } from "../../shared-contracts/index.js";

const log = createLogger("use-case:request-property-summary");

/**
 * After a positive yes/no answer, moves the thread forward and asks for a short property description.
 */
export async function requestPropertySummary(
  deps: InboundWhatsAppDeps,
  params: { thread: ConversationThread; toWhatsAppId: string; inboundText: string },
): Promise<void> {
  const { thread, toWhatsAppId, inboundText } = params;

  await deps.threads.updateThread(thread.id, {
    state: CONVERSATION_THREAD_STATE.AWAITING_PROPERTY_SUMMARY,
    lastMessageText: inboundText,
    touchLastInboundAt: true,
  });
  log.info("thread state transition", {
    threadId: thread.id,
    to: CONVERSATION_THREAD_STATE.AWAITING_PROPERTY_SUMMARY,
  });

  const send = await deps.messaging.sendTextMessage(toWhatsAppId, MSG_REQUEST_PROPERTY_SUMMARY);
  if (send.ok) {
    log.info("outgoing message sent", { threadId: thread.id, kind: "request_property_summary" });
    await deps.threads.updateThread(thread.id, {
      lastMessageText: MSG_REQUEST_PROPERTY_SUMMARY,
      touchLastOutboundAt: true,
    });
  } else {
    log.warn("outgoing message failed", { threadId: thread.id, error: send.error, status: send.status });
  }
}
