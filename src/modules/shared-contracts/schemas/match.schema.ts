import { z } from "zod";
import {
  CHANNEL,
  MATCH_STATUS,
  MatchSeekerOutcomeSchema,
  MatchStatusSchema,
  PARTICIPANT_TYPE,
  ParticipantTypeSchema,
} from "../enums.js";
import type { MatchStatus } from "../enums.js";
import { isFirestoreTimestamp } from "./firestore-common.js";
import type { Timestamp } from "firebase-admin/firestore";

const TimestampOrNullOptional = z
  .union([z.custom<Timestamp>(isFirestoreTimestamp), z.null(), z.undefined()])
  .transform((v): Timestamp | null => (v === undefined ? null : v));

export const MatchSchema = z.object({
  id: z.string().min(1),
  searchId: z.string().nullable(),
  seekerAgentId: z.string().nullable(),
  responderId: z.string().nullable(),
  responderType: z.string().nullable(),
  responseId: z.string().nullable(),
  commissionSnapshot: z.unknown().nullable(),
  channel: z.enum([CHANNEL.WHATSAPP]),
  status: MatchStatusSchema,
  responderWhatsapp: z.string().nullable().optional(),
  notificationSentAt: TimestampOrNullOptional,
  openedAt: TimestampOrNullOptional,
  closedAt: TimestampOrNullOptional,
  createdAt: TimestampOrNullOptional,
});

export type Match = z.infer<typeof MatchSchema>;

/** Maps pre–Hommi-Agent operational statuses to the seeker-centric model. */
function coerceMatchStatus(raw: unknown): MatchStatus {
  const s = typeof raw === "string" ? raw : "";
  if (s === MATCH_STATUS.ABIERTO || s === MATCH_STATUS.EXITOSO || s === MATCH_STATUS.CERRADO) {
    return s;
  }
  if (s === "created" || s === "notified_to_seeker" || s === "contact_link_delivered") {
    return MATCH_STATUS.ABIERTO;
  }
  if (s === "closed") {
    return MATCH_STATUS.CERRADO;
  }
  return MATCH_STATUS.ABIERTO;
}

function nullableString(v: unknown): string | null {
  if (v === undefined || v === null) {
    return null;
  }
  if (typeof v === "string") {
    return v.length > 0 ? v : null;
  }
  return null;
}

export function parseMatchFromFirestore(id: string, data: Record<string, unknown>): Match | null {
  const ch = data["channel"];
  if (ch !== undefined && ch !== null && ch !== CHANNEL.WHATSAPP) {
    return null;
  }
  const merged = {
    id,
    searchId: nullableString(data["searchId"]),
    seekerAgentId: nullableString(data["seekerAgentId"]),
    responderId: nullableString(data["responderId"]),
    responderType: data["responderType"] === PARTICIPANT_TYPE.AGENT ? PARTICIPANT_TYPE.AGENT : PARTICIPANT_TYPE.CONTACT,
    responseId: nullableString(data["responseId"]),
    commissionSnapshot: data["commissionSnapshot"] === undefined ? null : data["commissionSnapshot"],
    channel: CHANNEL.WHATSAPP,
    status: coerceMatchStatus(data["status"]),
    responderWhatsapp: nullableString(data["responderWhatsapp"]),
    notificationSentAt: data["notificationSentAt"],
    openedAt: data["openedAt"],
    closedAt: data["closedAt"],
    createdAt: data["createdAt"],
  };
  const parsed = MatchSchema.safeParse(merged);
  return parsed.success ? parsed.data : null;
}

export const MatchSeekerOutcomeUpdateSchema = z.object({
  status: MatchSeekerOutcomeSchema,
});

export const MatchCreateSchema = z.object({
  searchId: z.string().min(1),
  seekerAgentId: z.string().min(1),
  responderId: z.string().min(1),
  responderType: ParticipantTypeSchema,
  responseId: z.string().min(1),
  commissionSnapshot: z.unknown().nullable(),
  channel: z.enum([CHANNEL.WHATSAPP]),
  responderWhatsapp: z.string().min(1),
});
