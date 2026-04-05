import type { NormalizedIncomingWhatsAppMessage } from "../schemas/normalized-message.js";
import { classifyYesNoReply } from "../domain/classify-yes-no.js";
import type { NetworkMember } from "../domain/models.js";
import type { InboundWhatsAppDeps } from "./ports.js";
import { createLogger } from "../../shared/logger/logger.js";
import {
  MATCH_STATUS,
  OUTREACH_RESPONSE_STATUS,
  PARTICIPANT_TYPE,
} from "../../shared-contracts/index.js";
import {
  MSG_MATCH_SEEKER_CLARIFICATION,
  MSG_MATCH_SEEKER_CONFIRMED_INTEREST,
  MSG_MATCH_SEEKER_DECLINED_MATCH,
} from "../domain/agent-messages.js";

const log = createLogger("use-case:seeker-match-reply");

/**
 * When the seeker (agent who created the search) replies sí/no by WhatsApp after a match_notification,
 * updates match to exitoso / cerrado and the outreach row. Only runs if there is no active distribution thread.
 */
export async function tryHandleSeekerMatchReply(
  deps: InboundWhatsAppDeps,
  member: NetworkMember,
  message: NormalizedIncomingWhatsAppMessage,
): Promise<boolean> {
  if (member.type !== PARTICIPANT_TYPE.AGENT) {
    return false;
  }

  const outreach = await deps.outreach.findLatestPendingMatchNotificationForReceiver(member.id);
  if (!outreach?.relatedMatchId) {
    return false;
  }

  const match = await deps.matches.findById(outreach.relatedMatchId);
  if (!match || match.status !== MATCH_STATUS.ABIERTO) {
    return false;
  }

  const text = (message.text ?? "").trim();
  const classification = classifyYesNoReply(text);

  if (classification === "ambiguous") {
    log.info("seeker match reply ambiguous; asking for clarity", { matchId: match.id, outreachId: outreach.id });
    const send = await deps.messaging.sendTextMessage(message.from, MSG_MATCH_SEEKER_CLARIFICATION);
    if (!send.ok) {
      log.warn("seeker clarification message failed", { matchId: match.id, error: send.error });
    }
    return true;
  }

  if (classification === OUTREACH_RESPONSE_STATUS.YES) {
    await deps.matches.updateSeekerOutcome(match.id, MATCH_STATUS.EXITOSO);
    await deps.outreach.updateResponseStatus(outreach.id, OUTREACH_RESPONSE_STATUS.YES);
    log.info("match marked exitoso (seeker interested)", { matchId: match.id });
    const send = await deps.messaging.sendTextMessage(message.from, MSG_MATCH_SEEKER_CONFIRMED_INTEREST);
    if (!send.ok) {
      log.warn("seeker ack after exitoso failed", { matchId: match.id, error: send.error });
    }
    return true;
  }

  await deps.matches.updateSeekerOutcome(match.id, MATCH_STATUS.CERRADO);
  await deps.outreach.updateResponseStatus(outreach.id, OUTREACH_RESPONSE_STATUS.NO);
  log.info("match marked cerrado (seeker not interested)", { matchId: match.id });
  const send = await deps.messaging.sendTextMessage(message.from, MSG_MATCH_SEEKER_DECLINED_MATCH);
  if (!send.ok) {
    log.warn("seeker ack after cerrado failed", { matchId: match.id, error: send.error });
  }
  return true;
}
