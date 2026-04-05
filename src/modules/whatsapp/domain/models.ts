/**
 * Firestore-aligned entities: source of truth is `shared-contracts`.
 * This file re-exports them plus small view-models used only in this module.
 */
export type {
  Agent,
  Contact,
  ConversationThread,
  Match,
  Outreach,
  Response,
  Search,
  StructuredPropertySummary,
} from "../../shared-contracts/index.js";

export type {
  MatchStatus,
  OutreachType,
  ParticipantType as NetworkMemberKind,
  ResponseStatus,
} from "../../shared-contracts/enums.js";

import type { ParticipantType } from "../../shared-contracts/enums.js";

/** Unified directory participant for inbound WhatsApp resolution (contacts + agents). */
export type NetworkMember = {
  id: string;
  type: ParticipantType;
  fullName: string;
  agencyName: string;
  phone: string;
  whatsapp: string;
  directoryStatus: string;
  isPaused: boolean;
};

/** Normalized target for outbound search distribution (MVP). */
export type Recipient = {
  id: string;
  type: ParticipantType;
  fullName: string;
  agencyName: string;
  whatsapp: string;
  city: string;
  propertyTypes: string[];
  operationTypes: string[];
  zones: string[];
  tags: string[];
  isPaused: boolean;
};

export type YesNoClassification = "yes" | "no" | "ambiguous";
