import { buildSearchDistributionMessage } from "../domain/build-search-distribution-message.js";
import { createLogger } from "../../shared/logger/logger.js";
import type { SearchDistributionDeps } from "./ports.js";
import { MAX_DISTRIBUTION_RECIPIENTS, findRelevantRecipients } from "./find-relevant-recipients.js";
import { createSearchDistributionOutreach } from "./create-search-distribution-outreach.js";
import { createOrUpdateConversationThreadForDistribution } from "./create-or-update-conversation-thread-distribution.js";
import {
  CHANNEL,
  OUTREACH_DELIVERY_STATUS,
  SEARCH_STATUS,
} from "../../shared-contracts/index.js";

const log = createLogger("use-case:distribute-search");

export type DistributeSearchToNetworkResult = {
  searchId: string;
  ok: boolean;
  error?: string;
  recipientsConsidered: number;
  outreachCreated: number;
  messagesSent: number;
  messagesFailed: number;
  threadsCreated: number;
  threadsReused: number;
};

const DISTRIBUTABLE_STATUS = SEARCH_STATUS.ACTIVE;
const SCAN_LIMIT = 120;

function normalizeStatus(status: string | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

function isSearchExpired(search: { expiresAt?: { toMillis: () => number } | null }): boolean {
  const exp = search.expiresAt;
  if (exp == null) {
    return false;
  }
  try {
    return exp.toMillis() < Date.now();
  } catch {
    return false;
  }
}

/**
 * Manual trigger: load search, pick recipients, create outreach + thread, send first WhatsApp, update search status.
 */
export async function distributeSearchToNetwork(
  deps: SearchDistributionDeps,
  searchId: string,
): Promise<DistributeSearchToNetworkResult> {
  const empty = (overrides: Partial<DistributeSearchToNetworkResult> = {}): DistributeSearchToNetworkResult => ({
    searchId,
    ok: false,
    recipientsConsidered: 0,
    outreachCreated: 0,
    messagesSent: 0,
    messagesFailed: 0,
    threadsCreated: 0,
    threadsReused: 0,
    ...overrides,
  });

  const outcome = await deps.searches.findByIdWithOutcome(searchId);
  if (outcome.kind === "missing") {
    log.warn("search not found in Firestore", { searchId, hint: "same project as GOOGLE_APPLICATION_CREDENTIALS / Firebase init" });
    return empty({ error: "search_not_found" });
  }
  if (outcome.kind === "invalid") {
    log.warn("search doc failed validation", { searchId });
    return empty({ error: "search_document_invalid" });
  }
  const search = outcome.search;
  log.info("search loaded", { searchId, status: search.status });

  const st = normalizeStatus(search.status);
  if (st === SEARCH_STATUS.CLOSED || st === SEARCH_STATUS.EXPIRED) {
    log.warn("search not distributable (terminal status)", { searchId, status: search.status });
    return empty({ error: "search_closed_or_expired" });
  }
  if (isSearchExpired(search)) {
    log.warn("search expired by expiresAt", { searchId });
    return empty({ error: "search_expired" });
  }
  if (st !== DISTRIBUTABLE_STATUS) {
    log.warn("search not in active status", { searchId, status: search.status });
    return empty({ error: "search_not_active" });
  }

  const seekerAgent = search.agentId ? await deps.agents.findById(search.agentId) : null;
  const seekerCity = (seekerAgent?.city ?? "").trim();

  const hintsCity = seekerCity;
  let agents = await deps.agents.listByCity(hintsCity, SCAN_LIMIT);
  let contacts = await deps.contacts.listByCity(hintsCity, SCAN_LIMIT);

  if (hintsCity && (agents.length === 0 || contacts.length === 0)) {
    log.info("city cohort sparse; supplementing with broad scan", {
      searchId,
      city: hintsCity,
      agents: agents.length,
      contacts: contacts.length,
    });
  }
  if (agents.length < 30) {
    const broad = await deps.agents.listRecentForDistribution(SCAN_LIMIT);
    const merge = new Map(broad.map((a) => [a.id, a]));
    for (const a of agents) {
      merge.set(a.id, a);
    }
    agents = [...merge.values()];
  }
  if (contacts.length < 30) {
    const broad = await deps.contacts.listRecentForDistribution(SCAN_LIMIT);
    const merge = new Map(broad.map((c) => [c.id, c]));
    for (const c of contacts) {
      merge.set(c.id, c);
    }
    contacts = [...merge.values()];
  }

  const recipients = findRelevantRecipients(search, agents, contacts, search.agentId, seekerCity);
  log.info("recipients selected", {
    searchId,
    count: recipients.length,
    cap: MAX_DISTRIBUTION_RECIPIENTS,
  });

  if (recipients.length === 0) {
    log.warn("no recipients after filters", { searchId });
    return empty({
      error: "no_recipients",
      recipientsConsidered: 0,
    });
  }

  const messageBody = buildSearchDistributionMessage(search);
  const preview = messageBody.slice(0, 200);

  let outreachCreated = 0;
  let messagesSent = 0;
  let messagesFailed = 0;
  let threadsCreated = 0;
  let threadsReused = 0;

  for (const recipient of recipients) {
    const outreachId = await createSearchDistributionOutreach(deps, {
      searchId,
      receiverId: recipient.id,
      receiverType: recipient.type,
      channel: CHANNEL.WHATSAPP,
    });
    outreachCreated += 1;
    log.info("search distribution outreach created", { searchId, outreachId, receiverId: recipient.id });

    const { threadId, reused } = await createOrUpdateConversationThreadForDistribution(deps.threads, {
      searchId,
      recipient,
      outreachId,
      messagePreview: preview,
    });
    if (reused) {
      threadsReused += 1;
      log.info("conversation thread reused", { searchId, threadId });
    } else {
      threadsCreated += 1;
      log.info("conversation thread created", { searchId, threadId });
    }

    const send = await deps.messaging.sendTextMessage(recipient.whatsapp, messageBody);
    if (send.ok) {
      messagesSent += 1;
      log.info("distribution message sent", { searchId, outreachId, to: recipient.whatsapp });
      await deps.outreach.updateDistributionDelivery(outreachId, {
        deliveryStatus: OUTREACH_DELIVERY_STATUS.SENT,
        messageId: send.messageId,
      });
    } else {
      messagesFailed += 1;
      log.warn("distribution message failed", {
        searchId,
        outreachId,
        status: send.status,
        error: send.error,
      });
      await deps.outreach.updateDistributionDelivery(outreachId, {
        deliveryStatus: OUTREACH_DELIVERY_STATUS.FAILED,
      });
    }
  }

  await deps.searches.updateStatus(searchId, SEARCH_STATUS.DISTRIBUTING);
  log.info("search status updated", { searchId, status: SEARCH_STATUS.DISTRIBUTING });

  log.info("distributeSearchToNetwork complete", {
    searchId,
    recipientsConsidered: recipients.length,
    outreachCreated,
    messagesSent,
    messagesFailed,
    threadsCreated,
    threadsReused,
  });

  return {
    searchId,
    ok: true,
    recipientsConsidered: recipients.length,
    outreachCreated,
    messagesSent,
    messagesFailed,
    threadsCreated,
    threadsReused,
  };
}
