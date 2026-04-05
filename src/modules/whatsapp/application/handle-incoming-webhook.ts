import { createLogger } from "../../shared/logger/logger.js";
import type { NormalizedIncomingWhatsAppMessage, NormalizedWebhookPayload } from "../schemas/normalized-message.js";
import {
  MSG_DECLINE_ACK,
  MSG_YES_NO_CLARIFICATION,
} from "../domain/agent-messages.js";
import type { InboundWhatsAppDeps } from "./ports.js";
import {
  CONVERSATION_THREAD_STATE,
  OUTREACH_RESPONSE_STATUS,
} from "../../shared-contracts/index.js";
import { processYesNoReply } from "./process-yes-no-reply.js";
import { requestPropertySummary } from "./request-property-summary.js";
import { savePropertySummaryFromIncomingMessage } from "./save-property-summary.js";
import { tryHandleSeekerMatchReply } from "./handle-seeker-match-reply.js";

const log = createLogger("whatsapp-application");

export type HandleIncomingWebhookResult = {
  accepted: number;
  handled: number;
  skipped: number;
};

async function handleOneNormalizedMessage(
  deps: InboundWhatsAppDeps,
  message: NormalizedIncomingWhatsAppMessage,
): Promise<"handled" | "skipped"> {
  const text = message.text?.trim() ?? "";
  if (!text) {
    log.info("inbound message skipped: empty text", { from: message.from, messageId: message.messageId });
    return "skipped";
  }

  log.info("inbound message received", {
    from: message.from,
    messageId: message.messageId,
    preview: text.slice(0, 120),
  });

  const member = await deps.networkMembers.findByWhatsAppOrPhone(message.from);
  if (!member) {
    log.info("network member not found for inbound sender", { from: message.from });
    return "skipped";
  }
  log.info("network member found", { memberId: member.id, memberType: member.type });

  const thread = await deps.threads.findProcessableWhatsAppThreadForParticipant(member.id);
  if (!thread) {
    const seekerMatchHandled = await tryHandleSeekerMatchReply(deps, member, message);
    if (seekerMatchHandled) {
      return "handled";
    }
    log.info("no processable conversation thread for member", { memberId: member.id, memberType: member.type });
    return "skipped";
  }
  log.info("conversation thread found", { threadId: thread.id, state: thread.state });

  if (!thread.outreachId) {
    log.warn("thread missing outreachId; skipping safely", { threadId: thread.id });
    return "skipped";
  }

  const outreach = await deps.outreach.findById(thread.outreachId);
  if (!outreach) {
    log.warn("outreach document missing; skipping safely", {
      threadId: thread.id,
      outreachId: thread.outreachId,
    });
    return "skipped";
  }

  if (thread.state === CONVERSATION_THREAD_STATE.AWAITING_PROPERTY_SUMMARY) {
    await savePropertySummaryFromIncomingMessage(deps, {
      thread,
      member,
      toWhatsAppId: message.from,
      summaryText: text,
    });
    return "handled";
  }

  if (thread.state === CONVERSATION_THREAD_STATE.AWAITING_YES_NO) {
    const decision = processYesNoReply(thread, outreach, text);
    if (!decision.ok) {
      log.warn("yes/no processor rejected message", { threadId: thread.id, reason: decision.reason });
      return "skipped";
    }

    log.info("yes/no classification result", {
      threadId: thread.id,
      classification: decision.classification,
    });

    if (decision.classification === OUTREACH_RESPONSE_STATUS.YES) {
      await deps.outreach.updateResponseStatus(thread.outreachId, OUTREACH_RESPONSE_STATUS.YES);
      await requestPropertySummary(deps, {
        thread,
        toWhatsAppId: message.from,
        inboundText: text,
      });
      return "handled";
    }

    if (decision.classification === OUTREACH_RESPONSE_STATUS.NO) {
      await deps.outreach.updateResponseStatus(thread.outreachId, OUTREACH_RESPONSE_STATUS.NO);
      await deps.threads.updateThread(thread.id, {
        state: CONVERSATION_THREAD_STATE.CLOSED,
        lastMessageText: text,
        touchLastInboundAt: true,
      });
      log.info("thread state transition", { threadId: thread.id, to: CONVERSATION_THREAD_STATE.CLOSED });

      const send = await deps.messaging.sendTextMessage(message.from, MSG_DECLINE_ACK);
      if (send.ok) {
        log.info("outgoing message sent", { threadId: thread.id, kind: "decline_ack" });
        await deps.threads.updateThread(thread.id, {
          lastMessageText: MSG_DECLINE_ACK,
          touchLastOutboundAt: true,
        });
      } else {
        log.warn("outgoing message failed", { threadId: thread.id, error: send.error, status: send.status });
      }
      return "handled";
    }

    await deps.threads.updateThread(thread.id, {
      lastMessageText: text,
      touchLastInboundAt: true,
    });

    const send = await deps.messaging.sendTextMessage(message.from, MSG_YES_NO_CLARIFICATION);
    if (send.ok) {
      log.info("outgoing message sent", { threadId: thread.id, kind: "yes_no_clarification" });
      await deps.threads.updateThread(thread.id, {
        lastMessageText: MSG_YES_NO_CLARIFICATION,
        touchLastOutboundAt: true,
      });
    } else {
      log.warn("outgoing message failed", { threadId: thread.id, error: send.error, status: send.status });
    }
    return "handled";
  }

  log.info("thread state unexpected after guards; skipping", { threadId: thread.id, state: thread.state });
  return "skipped";
}

/**
 * Orchestrates inbound WhatsApp messages: lookup, state machine, Firestore updates, outbound replies.
 */
export async function handleIncomingWhatsAppWebhook(
  payload: NormalizedWebhookPayload,
  deps: InboundWhatsAppDeps,
): Promise<HandleIncomingWebhookResult> {
  if (payload.messages.length === 0) {
    log.info("webhook received with no text messages to process");
    return { accepted: 0, handled: 0, skipped: 0 };
  }

  let handled = 0;
  let skipped = 0;

  for (const message of payload.messages) {
    const outcome = await handleOneNormalizedMessage(deps, message);
    if (outcome === "handled") {
      handled += 1;
    } else {
      skipped += 1;
    }
  }

  return { accepted: payload.messages.length, handled, skipped };
}
