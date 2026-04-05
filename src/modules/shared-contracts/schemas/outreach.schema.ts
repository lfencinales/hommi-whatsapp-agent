import { z } from "zod";
import {
  CHANNEL,
  OUTREACH_DELIVERY_STATUS,
  OUTREACH_RESPONSE_STATUS,
  OUTREACH_TYPE,
  OutreachDeliveryStatusSchema,
  OutreachResponseStatusSchema,
  OutreachTypeSchema,
  PARTICIPANT_TYPE,
  ParticipantTypeSchema,
} from "../enums.js";
import type { OutreachDeliveryStatus, OutreachResponseStatus, OutreachType, ParticipantType } from "../enums.js";
import { isFirestoreTimestamp } from "./firestore-common.js";
import type { Timestamp } from "firebase-admin/firestore";

const TimestampOrNullOptional = z
  .union([z.custom<Timestamp>(isFirestoreTimestamp), z.null(), z.undefined()])
  .transform((v): Timestamp | null => (v === undefined ? null : v));

function nullableString(v: unknown): string | null {
  if (v === undefined || v === null) {
    return null;
  }
  if (typeof v === "string") {
    return v.length > 0 ? v : null;
  }
  return null;
}

function coerceOutreachType(raw: unknown): OutreachType {
  if (raw === OUTREACH_TYPE.MATCH_NOTIFICATION) {
    return OUTREACH_TYPE.MATCH_NOTIFICATION;
  }
  return OUTREACH_TYPE.SEARCH_DISTRIBUTION;
}

function coerceDelivery(raw: unknown): OutreachDeliveryStatus {
  const s = typeof raw === "string" ? raw : "";
  if (s === OUTREACH_DELIVERY_STATUS.SENT || s === OUTREACH_DELIVERY_STATUS.FAILED) {
    return s;
  }
  return OUTREACH_DELIVERY_STATUS.PENDING;
}

function coerceResponse(raw: unknown): OutreachResponseStatus {
  const s = typeof raw === "string" ? raw : "";
  if (
    s === OUTREACH_RESPONSE_STATUS.YES ||
    s === OUTREACH_RESPONSE_STATUS.NO ||
    s === OUTREACH_RESPONSE_STATUS.IGNORED
  ) {
    return s;
  }
  if (s === "ambiguous") {
    return OUTREACH_RESPONSE_STATUS.PENDING;
  }
  return OUTREACH_RESPONSE_STATUS.PENDING;
}

function coerceParticipantType(raw: unknown): ParticipantType {
  return raw === PARTICIPANT_TYPE.AGENT ? PARTICIPANT_TYPE.AGENT : PARTICIPANT_TYPE.CONTACT;
}

/** Canonical outreach entity (includes id). */
export const OutreachSchema = z.object({
  id: z.string().min(1),
  type: OutreachTypeSchema,
  searchId: z.string().nullable(),
  receiverId: z.string().nullable(),
  receiverType: ParticipantTypeSchema,
  channel: z.enum([CHANNEL.WHATSAPP]),
  deliveryStatus: OutreachDeliveryStatusSchema,
  responseStatus: OutreachResponseStatusSchema,
  sentAt: TimestampOrNullOptional,
  respondedAt: TimestampOrNullOptional,
  relatedResponseId: z.string().nullable().optional(),
  relatedMatchId: z.string().nullable().optional(),
  messageId: z.string().nullable().optional(),
});

export type Outreach = z.infer<typeof OutreachSchema>;

/** Parse Firestore document body + id into canonical Outreach. */
export function parseOutreachFromFirestore(id: string, data: Record<string, unknown>): Outreach | null {
  const ch = data["channel"];
  if (ch !== undefined && ch !== null && ch !== CHANNEL.WHATSAPP) {
    return null;
  }
  const receiverId = nullableString(data["receiverId"]);
  if (!receiverId) {
    return null;
  }
  const parsed = OutreachSchema.safeParse({
    id,
    type: coerceOutreachType(data["type"]),
    searchId: nullableString(data["searchId"]),
    receiverId,
    receiverType: coerceParticipantType(data["receiverType"]),
    channel: data["channel"] === CHANNEL.WHATSAPP ? CHANNEL.WHATSAPP : CHANNEL.WHATSAPP,
    deliveryStatus: coerceDelivery(data["deliveryStatus"]),
    responseStatus: coerceResponse(data["responseStatus"]),
    sentAt: data["sentAt"] === undefined ? null : data["sentAt"],
    respondedAt: data["respondedAt"] === undefined ? null : data["respondedAt"],
    relatedResponseId: nullableString(data["relatedResponseId"]),
    relatedMatchId: nullableString(data["relatedMatchId"]),
    messageId: nullableString(data["messageId"]),
  });
  return parsed.success ? parsed.data : null;
}

export const SearchDistributionOutreachCreateSchema = z.object({
  searchId: z.string().min(1),
  receiverId: z.string().min(1),
  receiverType: ParticipantTypeSchema,
  channel: z.enum([CHANNEL.WHATSAPP]),
});

export const MatchNotificationOutreachCreateSchema = z.object({
  searchId: z.string().min(1),
  receiverId: z.string().min(1),
  receiverType: ParticipantTypeSchema,
  relatedResponseId: z.string().min(1),
  relatedMatchId: z.string().min(1),
  channel: z.enum([CHANNEL.WHATSAPP]),
  deliveryStatus: OutreachDeliveryStatusSchema,
  messageId: z.string().optional(),
});

export const OutreachDeliveryUpdateSchema = z.object({
  deliveryStatus: OutreachDeliveryStatusSchema,
  messageId: z.string().optional(),
});
