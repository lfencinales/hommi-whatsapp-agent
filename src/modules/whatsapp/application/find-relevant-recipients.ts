import type { Agent, Contact, Recipient, Search } from "../domain/models.js";
import { resolveWhatsAppRecipient } from "../domain/whatsapp-recipient.js";
import { AGENT_ACCOUNT_STATUS, PARTICIPANT_TYPE } from "../../shared-contracts/index.js";

/** Hard cap for MVP distribution blast radius. */
export const MAX_DISTRIBUTION_RECIPIENTS = 20;

export type SearchDistributionHints = {
  cityNorm: string;
  propertyTypes: string[];
  operationTypes: string[];
  zones: string[];
};

function normStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function normScalarOrArray(value: unknown): string[] {
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim().toLowerCase()];
  }
  return normStrings(value);
}

function singleString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Pulls coarse hints from search.parsedData (flexible keys) for MVP matching.
 */
export function buildSearchDistributionHints(search: Search, seekerCityFallback: string): SearchDistributionHints {
  const pd = search.parsedData ?? {};
  const cityRaw =
    singleString(pd["city"]) ||
    singleString(pd["location"]) ||
    seekerCityFallback.trim().toLowerCase();

  const propertyTypes = [
    ...normScalarOrArray(pd["propertyType"]),
    ...normStrings(pd["propertyTypes"]),
  ];
  const operationTypes = [
    ...normScalarOrArray(pd["operationType"]),
    ...normStrings(pd["operationTypes"]),
  ];
  const zones = [...normScalarOrArray(pd["zone"]), ...normStrings(pd["zones"])];

  return {
    cityNorm: cityRaw,
    propertyTypes: [...new Set(propertyTypes)],
    operationTypes: [...new Set(operationTypes)],
    zones: [...new Set(zones)],
  };
}

function intersects(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) {
    return false;
  }
  const setB = new Set(b);
  return a.some((x) => setB.has(x));
}

function scoreRecipient(r: Recipient, hints: SearchDistributionHints): number {
  let score = 0;
  if (hints.cityNorm && r.city.trim().toLowerCase() === hints.cityNorm) {
    score += 3;
  }
  if (intersects(r.propertyTypes, hints.propertyTypes)) {
    score += 2;
  }
  if (intersects(r.operationTypes, hints.operationTypes)) {
    score += 2;
  }
  if (intersects(r.zones, hints.zones)) {
    score += 2;
  }
  return score;
}

function contactToRecipient(c: Contact): Recipient | null {
  const wa = resolveWhatsAppRecipient(c.whatsapp, c.phone);
  if (!wa) {
    return null;
  }
  return {
    id: c.id,
    type: PARTICIPANT_TYPE.CONTACT,
    fullName: c.fullName ?? "",
    agencyName: c.agencyName ?? "",
    whatsapp: wa,
    city: (c.city ?? "").trim(),
    propertyTypes: normStrings(c.propertyTypes),
    operationTypes: normStrings(c.operationTypes),
    zones: normStrings(c.zones),
    tags: normStrings(c.tags),
    isPaused: c.isPaused ?? false,
  };
}

function agentToRecipient(a: Agent): Recipient | null {
  const wa = resolveWhatsAppRecipient(a.whatsapp, a.phone);
  if (!wa) {
    return null;
  }
  return {
    id: a.id,
    type: PARTICIPANT_TYPE.AGENT,
    fullName: a.fullName ?? "",
    agencyName: a.agencyName ?? "",
    whatsapp: wa,
    city: (a.city ?? "").trim(),
    propertyTypes: normStrings(a.propertyTypes),
    operationTypes: normStrings(a.operationTypes),
    zones: normStrings(a.zones),
    tags: normStrings(a.tags),
    isPaused: false,
  };
}

function agentEligible(a: Agent, seekerAgentId: string | null | undefined): boolean {
  if (seekerAgentId != null && a.id === seekerAgentId) {
    return false;
  }
  const status = (a.accountStatus ?? "").trim().toLowerCase();
  if (status !== AGENT_ACCOUNT_STATUS.ACTIVE) {
    return false;
  }
  if (a.otpVerified !== true) {
    return false;
  }
  return true;
}

/**
 * Deterministic shortlist of agents + contacts for a search (MVP, no ML).
 */
export function findRelevantRecipients(
  search: Search,
  agents: Agent[],
  contacts: Contact[],
  seekerAgentId: string | null | undefined,
  seekerCityFallback: string,
): Recipient[] {
  const hints = buildSearchDistributionHints(search, seekerCityFallback);

  const raw: Recipient[] = [];

  for (const c of contacts) {
    if (c.isPaused === true) {
      continue;
    }
    const r = contactToRecipient(c);
    if (r) {
      raw.push(r);
    }
  }

  for (const a of agents) {
    if (!agentEligible(a, seekerAgentId)) {
      continue;
    }
    const r = agentToRecipient(a);
    if (r) {
      raw.push(r);
    }
  }

  const scored = raw.map((r) => ({ r, score: scoreRecipient(r, hints) }));
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return `${a.r.type}:${a.r.id}`.localeCompare(`${b.r.type}:${b.r.id}`);
  });

  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const { r } of scored) {
    const key = `${r.type}:${r.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(r);
    if (out.length >= MAX_DISTRIBUTION_RECIPIENTS) {
      break;
    }
  }

  return out;
}
