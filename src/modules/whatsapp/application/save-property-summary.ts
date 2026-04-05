import {
  MSG_MATCH_PIPELINE_DATA_MISSING,
  MSG_MATCH_PIPELINE_NOTIFY_FAILED,
  MSG_MATCH_PIPELINE_SUCCESS,
  MSG_SUMMARY_NEED_MORE_DETAIL,
} from "../domain/agent-messages.js";
import { buildStructuredPropertySummary } from "../domain/structured-property-summary.js";
import type { ConversationThread, NetworkMember } from "../domain/models.js";
import { hasUsefulPropertySummary } from "../domain/summary-usefulness.js";
import { resolveWhatsAppRecipient } from "../domain/whatsapp-recipient.js";
import type { InboundWhatsAppDeps } from "./ports.js";
import { createLogger } from "../../shared/logger/logger.js";
import { createMatchAndNotifySeeker, type MatchNotifyOutcome } from "./create-match-and-notify-seeker.js";
import { createResponseFromSummary } from "./create-response-from-summary.js";
import { CONVERSATION_THREAD_STATE } from "../../shared-contracts/index.js";

const log = createLogger("use-case:save-property-summary");

async function sendResponderAndTouchOutbound(
  deps: InboundWhatsAppDeps,
  threadId: string,
  toWhatsAppId: string,
  body: string,
  kind: string,
): Promise<void> {
  const send = await deps.messaging.sendTextMessage(toWhatsAppId, body);
  if (send.ok) {
    log.info("outgoing message sent", { threadId, kind });
    await deps.threads.updateThread(threadId, {
      lastMessageText: body,
      touchLastOutboundAt: true,
    });
  } else {
    log.warn("outgoing message failed", { threadId, kind, error: send.error, status: send.status });
  }
}

/**
 * Validates summary usefulness, persists formal response + match, notifies seeker, updates Firestore evidence.
 */
export async function savePropertySummaryFromIncomingMessage(
  deps: InboundWhatsAppDeps,
  params: { thread: ConversationThread; member: NetworkMember; toWhatsAppId: string; summaryText: string },
): Promise<void> {
  const { thread, member, toWhatsAppId, summaryText } = params;

  await deps.threads.updateThread(thread.id, {
    lastMessageText: summaryText,
    touchLastInboundAt: true,
  });

  if (!hasUsefulPropertySummary(summaryText)) {
    log.info("property summary failed usefulness check", { threadId: thread.id });
    await sendResponderAndTouchOutbound(deps, thread.id, toWhatsAppId, MSG_SUMMARY_NEED_MORE_DETAIL, "summary_need_detail");
    return;
  }
  log.info("property summary passed usefulness check", { threadId: thread.id });

  const sourceOutreach = thread.outreachId ? await deps.outreach.findById(thread.outreachId) : null;
  const searchId = thread.searchId ?? sourceOutreach?.searchId;
  if (!searchId) {
    log.warn("cannot resolve searchId for match pipeline", { threadId: thread.id });
    await sendResponderAndTouchOutbound(deps, thread.id, toWhatsAppId, MSG_MATCH_PIPELINE_DATA_MISSING, "pipeline_missing_search");
    return;
  }

  const search = await deps.searches.findById(searchId);
  if (!search) {
    log.warn("search document not found", { searchId, threadId: thread.id });
    await sendResponderAndTouchOutbound(deps, thread.id, toWhatsAppId, MSG_MATCH_PIPELINE_DATA_MISSING, "pipeline_missing_search_doc");
    return;
  }

  const seekerAgentId = search.agentId;
  if (!seekerAgentId) {
    log.warn("search missing agentId", { searchId, threadId: thread.id });
    await sendResponderAndTouchOutbound(deps, thread.id, toWhatsAppId, MSG_MATCH_PIPELINE_DATA_MISSING, "pipeline_missing_seeker_id");
    return;
  }

  const seekerAgent = await deps.agents.findById(seekerAgentId);
  if (!seekerAgent) {
    log.warn("seeker agent not found", { seekerAgentId, threadId: thread.id });
    await sendResponderAndTouchOutbound(deps, thread.id, toWhatsAppId, MSG_MATCH_PIPELINE_DATA_MISSING, "pipeline_missing_seeker_agent");
    return;
  }
  log.info("seeker agent found", { seekerAgentId });

  if (!resolveWhatsAppRecipient(seekerAgent.whatsapp, seekerAgent.phone)) {
    log.warn("seeker agent missing usable whatsapp/phone", { seekerAgentId });
    await sendResponderAndTouchOutbound(deps, thread.id, toWhatsAppId, MSG_MATCH_PIPELINE_DATA_MISSING, "pipeline_missing_seeker_whatsapp");
    return;
  }
  if (!resolveWhatsAppRecipient(member.whatsapp, member.phone)) {
    log.warn("responder missing usable whatsapp/phone", { memberId: member.id, memberType: member.type });
    await sendResponderAndTouchOutbound(deps, thread.id, toWhatsAppId, MSG_MATCH_PIPELINE_DATA_MISSING, "pipeline_missing_responder_whatsapp");
    return;
  }

  const structured = buildStructuredPropertySummary(summaryText);

  let responseId: string;
  try {
    responseId = await createResponseFromSummary(deps, {
      searchId,
      member,
      rawSummary: summaryText,
      structured,
    });
  } catch (err) {
    log.warn("failed to create response document", {
      threadId: thread.id,
      message: err instanceof Error ? err.message : String(err),
    });
    await sendResponderAndTouchOutbound(deps, thread.id, toWhatsAppId, MSG_MATCH_PIPELINE_DATA_MISSING, "pipeline_response_write_failed");
    return;
  }
  log.info("response created", { responseId, searchId, receiverId: member.id, receiverType: member.type });

  let notifyOutcome: MatchNotifyOutcome = "notify_failed";
  try {
    notifyOutcome = await createMatchAndNotifySeeker(deps, {
      responder: member,
      search,
      seekerAgent,
      responseId,
      structured,
    });
  } catch (err) {
    log.warn("createMatchAndNotifySeeker threw", {
      threadId: thread.id,
      responseId,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  await deps.threads.updateThread(thread.id, {
    state: CONVERSATION_THREAD_STATE.SUMMARY_RECEIVED,
    provisionalPropertySummary: null,
    lastMessageText: summaryText,
  });
  log.info("thread state transition", { threadId: thread.id, to: CONVERSATION_THREAD_STATE.SUMMARY_RECEIVED });

  const responderAck =
    notifyOutcome === "notified" ? MSG_MATCH_PIPELINE_SUCCESS : MSG_MATCH_PIPELINE_NOTIFY_FAILED;
  await sendResponderAndTouchOutbound(deps, thread.id, toWhatsAppId, responderAck, "responder_pipeline_ack");
}
