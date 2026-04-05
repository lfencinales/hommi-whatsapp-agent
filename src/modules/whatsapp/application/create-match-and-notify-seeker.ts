import type { Agent, NetworkMember, Search, StructuredPropertySummary } from "../domain/models.js";
import { buildSeekerMatchNotification } from "../domain/seeker-match-notification.js";
import { resolveWhatsAppRecipient } from "../domain/whatsapp-recipient.js";
import type { InboundWhatsAppDeps } from "./ports.js";
import { createLogger } from "../../shared/logger/logger.js";
import {
  CHANNEL,
  OUTREACH_DELIVERY_STATUS,
  PARTICIPANT_TYPE,
  RESPONSE_STATUS,
  SEARCH_STATUS,
} from "../../shared-contracts/index.js";

const log = createLogger("use-case:create-match-notify");

export type MatchNotifyOutcome = "notified" | "notify_failed";

/**
 * Creates operational match evidence, notifies seeker on WhatsApp, records match_notification outreach, updates statuses.
 */
export async function createMatchAndNotifySeeker(
  deps: InboundWhatsAppDeps,
  params: {
    responder: NetworkMember;
    search: Search;
    seekerAgent: Agent;
    responseId: string;
    structured: StructuredPropertySummary;
  },
): Promise<MatchNotifyOutcome> {
  const { responder, search, seekerAgent, responseId, structured } = params;

  const seekerTo = resolveWhatsAppRecipient(seekerAgent.whatsapp, seekerAgent.phone);
  const responderWa = resolveWhatsAppRecipient(responder.whatsapp, responder.phone);

  if (!seekerTo) {
    log.warn("seeker agent missing usable whatsapp/phone", { agentId: seekerAgent.id });
    return "notify_failed";
  }
  if (!responderWa) {
    log.warn("responder missing usable whatsapp/phone", { memberId: responder.id, memberType: responder.type });
    return "notify_failed";
  }

  const seekerAgentId = search.agentId;
  if (!seekerAgentId) {
    log.warn("search missing agentId", { searchId: search.id });
    return "notify_failed";
  }

  const matchId = await deps.matches.create({
    searchId: search.id,
    seekerAgentId,
    responderId: responder.id,
    responderType: responder.type,
    responseId,
    commissionSnapshot: search.commissionScheme ?? null,
    channel: CHANNEL.WHATSAPP,
    responderWhatsapp: responderWa,
  });
  log.info("match created (abierto)", { matchId, searchId: search.id, responseId });

  const { body } = buildSeekerMatchNotification(structured, search.commissionScheme, responderWa);

  let sendResult = await deps.messaging.sendTextMessage(seekerTo, body);
  if (!sendResult.ok) {
    log.warn("seeker notification failed", {
      matchId,
      seekerAgentId,
      status: sendResult.status,
      error: sendResult.error,
    });
  } else {
    log.info("seeker notification sent", { matchId, seekerAgentId });
  }

  const outreachId = await deps.outreach.createMatchNotificationOutreach({
    searchId: search.id,
    receiverId: seekerAgentId,
    receiverType: PARTICIPANT_TYPE.AGENT,
    relatedResponseId: responseId,
    relatedMatchId: matchId,
    channel: CHANNEL.WHATSAPP,
    messageId: sendResult.ok ? sendResult.messageId : undefined,
    deliveryStatus: sendResult.ok ? OUTREACH_DELIVERY_STATUS.SENT : OUTREACH_DELIVERY_STATUS.FAILED,
  });
  log.info("match notification outreach created", {
    outreachId,
    matchId,
    deliveryStatus: sendResult.ok ? OUTREACH_DELIVERY_STATUS.SENT : OUTREACH_DELIVERY_STATUS.FAILED,
  });

  if (sendResult.ok) {
    await deps.responses.updateStatus(responseId, RESPONSE_STATUS.NOTIFIED);
    await deps.matches.markSeekerNotificationSent(matchId);
    await deps.searches.updateStatus(search.id, SEARCH_STATUS.CLOSED);
    log.info("response status updated", { responseId, status: RESPONSE_STATUS.NOTIFIED });
    log.info("match remains abierto until seeker replies on WhatsApp", { matchId });
    log.info("search status updated", { searchId: search.id, status: SEARCH_STATUS.CLOSED });
    return "notified";
  }

  return "notify_failed";
}
