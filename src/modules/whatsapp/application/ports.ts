import type {
  Agent,
  Contact,
  ConversationThread,
  Match,
  NetworkMember,
  NetworkMemberKind,
  Outreach,
  Response,
  Search,
  StructuredPropertySummary,
} from "../domain/models.js";
import type { ThreadState } from "../domain/conversation-state.js";
import type { SendTextMessageResult } from "../../shared/types/whatsapp-send-result.js";
import type { MatchSeekerOutcome } from "../../shared-contracts/enums.js";

export type ConversationThreadPatch = {
  state?: ThreadState;
  lastMessageText?: string;
  provisionalPropertySummary?: string | null;
  searchId?: string;
  outreachId?: string;
  /** When true, sets lastInboundAt to server time. */
  touchLastInboundAt?: boolean;
  /** When true, sets lastOutboundAt to server time. */
  touchLastOutboundAt?: boolean;
};

export type CreateResponseInput = {
  searchId: string;
  receiverId: string;
  receiverType: string;
  interested: boolean;
  propertySummaryRaw: string;
  propertySummaryStructured: StructuredPropertySummary;
  originChannel: string;
  initialStatus: Response["status"];
};

export type CreateMatchInput = {
  searchId: string;
  seekerAgentId: string;
  responderId: string;
  responderType: string;
  responseId: string;
  commissionSnapshot: unknown;
  channel: string;
  responderWhatsapp: string;
};

export type CreateMatchNotificationOutreachInput = {
  searchId: string;
  receiverId: string;
  receiverType: string;
  relatedResponseId: string;
  relatedMatchId: string;
  channel: string;
  messageId?: string | undefined;
  deliveryStatus: string;
};

export type CreateSearchDistributionOutreachInput = {
  searchId: string;
  receiverId: string;
  receiverType: string;
  channel: string;
};

export type CreateDistributionThreadInput = {
  searchId: string;
  participantId: string;
  participantType: NetworkMemberKind;
  outreachId: string;
  channel: string;
  initialMessagePreview: string;
};

export type ContactsRepositoryPort = {
  /** Single exact match against `whatsapp` or `phone` (one variant). */
  findByWhatsappOrPhoneValue(value: string): Promise<Contact | null>;
  findByWhatsAppOrPhone(rawFrom: string): Promise<Contact | null>;
  listByCity(city: string, limit: number): Promise<Contact[]>;
  /** Broad scan when city matching is not available (MVP cap). */
  listRecentForDistribution(limit: number): Promise<Contact[]>;
};

export type ConversationThreadsRepositoryPort = {
  findProcessableWhatsAppThreadForParticipant(participantId: string): Promise<ConversationThread | null>;
  findOpenThreadForSearchParticipant(
    searchId: string,
    participantId: string,
    participantType: NetworkMemberKind,
    channel: string,
  ): Promise<ConversationThread | null>;
  createDistributionThread(input: CreateDistributionThreadInput): Promise<string>;
  updateThread(threadId: string, patch: ConversationThreadPatch): Promise<void>;
};

export type OutreachRepositoryPort = {
  findById(id: string): Promise<Outreach | null>;
  /** Latest match_notification to this receiver still awaiting sí/no (for seeker WhatsApp replies). */
  findLatestPendingMatchNotificationForReceiver(receiverId: string): Promise<Outreach | null>;
  updateResponseStatus(outreachId: string, responseStatus: string): Promise<void>;
  createMatchNotificationOutreach(input: CreateMatchNotificationOutreachInput): Promise<string>;
  createSearchDistributionOutreach(input: CreateSearchDistributionOutreachInput): Promise<string>;
  updateDistributionDelivery(
    outreachId: string,
    input: { deliveryStatus: string; messageId?: string | undefined },
  ): Promise<void>;
};

export type AgentsRepositoryPort = {
  findById(id: string): Promise<Agent | null>;
  /** Single exact match against `whatsapp` or `phone` (one variant). */
  findByWhatsappOrPhoneValue(value: string): Promise<Agent | null>;
  findByWhatsAppOrPhone(rawFrom: string): Promise<Agent | null>;
  listByCity(city: string, limit: number): Promise<Agent[]>;
  listRecentForDistribution(limit: number): Promise<Agent[]>;
};

export type NetworkMembersRepositoryPort = {
  findByWhatsAppOrPhone(rawFrom: string): Promise<NetworkMember | null>;
};

/** Distinguishes missing Firestore doc vs doc that fails shared-contracts parse. */
export type SearchFindOutcome =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "ok"; search: Search };

export type SearchesRepositoryPort = {
  findById(id: string): Promise<Search | null>;
  findByIdWithOutcome(id: string): Promise<SearchFindOutcome>;
  updateStatus(searchId: string, status: string): Promise<void>;
};

export type ResponsesRepositoryPort = {
  create(input: CreateResponseInput): Promise<string>;
  updateStatus(responseId: string, status: string): Promise<void>;
};

export type MatchesRepositoryPort = {
  create(input: CreateMatchInput): Promise<string>;
  findById(id: string): Promise<Match | null>;
  /** After WhatsApp to seeker is sent; match stays `abierto` until seeker replies. */
  markSeekerNotificationSent(matchId: string): Promise<void>;
  /** Seeker said sí → exitoso, no → cerrado. */
  updateSeekerOutcome(matchId: string, outcome: MatchSeekerOutcome): Promise<void>;
};

export type WhatsAppMessagingPort = {
  sendTextMessage(to: string, body: string): Promise<SendTextMessageResult>;
};

export type InboundWhatsAppDeps = {
  networkMembers: NetworkMembersRepositoryPort;
  threads: ConversationThreadsRepositoryPort;
  outreach: OutreachRepositoryPort;
  agents: AgentsRepositoryPort;
  searches: SearchesRepositoryPort;
  responses: ResponsesRepositoryPort;
  matches: MatchesRepositoryPort;
  messaging: WhatsAppMessagingPort;
};

export type SearchDistributionDeps = {
  searches: SearchesRepositoryPort;
  agents: AgentsRepositoryPort;
  contacts: ContactsRepositoryPort;
  threads: ConversationThreadsRepositoryPort;
  outreach: OutreachRepositoryPort;
  messaging: WhatsAppMessagingPort;
};
