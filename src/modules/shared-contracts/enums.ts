import { z } from "zod";

/** Participant on a conversation thread or outreach receiver. */
export const PARTICIPANT_TYPES = ["contact", "agent"] as const;
export const ParticipantTypeSchema = z.enum(PARTICIPANT_TYPES);
export type ParticipantType = z.infer<typeof ParticipantTypeSchema>;

export const PARTICIPANT_TYPE = {
  CONTACT: "contact",
  AGENT: "agent",
} as const satisfies Record<string, ParticipantType>;

export const CONVERSATION_THREAD_STATES = [
  "idle",
  "awaiting_yes_no",
  "awaiting_property_summary",
  "summary_received",
  "closed",
] as const;
export const ConversationThreadStateSchema = z.enum(CONVERSATION_THREAD_STATES);
export type ConversationThreadState = z.infer<typeof ConversationThreadStateSchema>;

export const CONVERSATION_THREAD_STATE = {
  IDLE: "idle",
  AWAITING_YES_NO: "awaiting_yes_no",
  AWAITING_PROPERTY_SUMMARY: "awaiting_property_summary",
  SUMMARY_RECEIVED: "summary_received",
  CLOSED: "closed",
} as const satisfies Record<string, ConversationThreadState>;

export const PROCESSABLE_THREAD_STATES: readonly ConversationThreadState[] = [
  CONVERSATION_THREAD_STATE.AWAITING_YES_NO,
  CONVERSATION_THREAD_STATE.AWAITING_PROPERTY_SUMMARY,
];

export const OUTREACH_TYPES = ["search_distribution", "match_notification"] as const;
export const OutreachTypeSchema = z.enum(OUTREACH_TYPES);
export type OutreachType = z.infer<typeof OutreachTypeSchema>;

export const OUTREACH_TYPE = {
  SEARCH_DISTRIBUTION: "search_distribution",
  MATCH_NOTIFICATION: "match_notification",
} as const satisfies Record<string, OutreachType>;

export const OUTREACH_DELIVERY_STATUSES = ["pending", "sent", "failed"] as const;
export const OutreachDeliveryStatusSchema = z.enum(OUTREACH_DELIVERY_STATUSES);
export type OutreachDeliveryStatus = z.infer<typeof OutreachDeliveryStatusSchema>;

export const OUTREACH_DELIVERY_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
} as const satisfies Record<string, OutreachDeliveryStatus>;

export const OUTREACH_RESPONSE_STATUSES = ["pending", "yes", "no", "ignored"] as const;
export const OutreachResponseStatusSchema = z.enum(OUTREACH_RESPONSE_STATUSES);
export type OutreachResponseStatus = z.infer<typeof OutreachResponseStatusSchema>;

export const OUTREACH_RESPONSE_STATUS = {
  PENDING: "pending",
  YES: "yes",
  NO: "no",
  IGNORED: "ignored",
} as const satisfies Record<string, OutreachResponseStatus>;

export const CHANNELS = ["whatsapp"] as const;
export const ChannelSchema = z.enum(CHANNELS);
export type Channel = z.infer<typeof ChannelSchema>;

export const CHANNEL = {
  WHATSAPP: "whatsapp",
} as const satisfies Record<string, Channel>;

export const SEARCH_STATUSES = [
  "active",
  "distributing",
  "has_responses",
  "closed",
  "expired",
] as const;
export const SearchStatusSchema = z.enum(SEARCH_STATUSES);
export type SearchStatus = z.infer<typeof SearchStatusSchema>;

export const SEARCH_STATUS = {
  ACTIVE: "active",
  DISTRIBUTING: "distributing",
  HAS_RESPONSES: "has_responses",
  CLOSED: "closed",
  EXPIRED: "expired",
} as const satisfies Record<string, SearchStatus>;

export const RESPONSE_STATUSES = ["received", "validated", "notified", "discarded", "matched"] as const;
export const ResponseStatusSchema = z.enum(RESPONSE_STATUSES);
export type ResponseStatus = z.infer<typeof ResponseStatusSchema>;

export const RESPONSE_STATUS = {
  RECEIVED: "received",
  VALIDATED: "validated",
  NOTIFIED: "notified",
  DISCARDED: "discarded",
  MATCHED: "matched",
} as const satisfies Record<string, ResponseStatus>;

/** Match lifecycle for seeker funnel analytics (Spanish canonical values in Firestore). */
export const MATCH_STATUSES = ["abierto", "exitoso", "cerrado"] as const;
export const MatchStatusSchema = z.enum(MATCH_STATUSES);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const MATCH_STATUS = {
  ABIERTO: "abierto",
  EXITOSO: "exitoso",
  CERRADO: "cerrado",
} as const satisfies Record<string, MatchStatus>;

/** Terminal outcomes only (seeker sí / no). */
export const MATCH_SEEKER_OUTCOMES = [MATCH_STATUS.EXITOSO, MATCH_STATUS.CERRADO] as const;
export const MatchSeekerOutcomeSchema = z.enum(MATCH_SEEKER_OUTCOMES);
export type MatchSeekerOutcome = z.infer<typeof MatchSeekerOutcomeSchema>;

export function isConversationThreadState(value: string): value is ConversationThreadState {
  return (CONVERSATION_THREAD_STATES as readonly string[]).includes(value);
}

export function isProcessableThreadState(state: ConversationThreadState): boolean {
  return (PROCESSABLE_THREAD_STATES as readonly string[]).includes(state);
}

/** Agent.accountStatus (MVP gate for distribution). */
export const AGENT_ACCOUNT_STATUS = {
  ACTIVE: "active",
} as const;
