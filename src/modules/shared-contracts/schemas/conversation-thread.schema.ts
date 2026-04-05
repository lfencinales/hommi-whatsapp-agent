import { z } from "zod";
import { CHANNEL, ConversationThreadStateSchema, PARTICIPANT_TYPE, ParticipantTypeSchema } from "../enums.js";
import type { ConversationThreadState, ParticipantType } from "../enums.js";
import { isFirestoreTimestamp } from "./firestore-common.js";
import type { Timestamp } from "firebase-admin/firestore";

const TimestampOrNullOptional = z
  .union([z.custom<Timestamp>(isFirestoreTimestamp), z.null(), z.undefined()])
  .transform((v): Timestamp | null => (v === undefined ? null : v));

const stringOrNull = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v): string | null => (v === undefined || v === null ? null : v));

/**
 * Legacy: map `contactId` → `participantId` + `participantType: contact` before parsing.
 */
export function preprocessConversationThreadDocument(raw: Record<string, unknown>): Record<string, unknown> {
  const o = { ...raw };
  if (!o["participantId"] && o["contactId"]) {
    o["participantId"] = o["contactId"];
    o["participantType"] = o["participantType"] ?? PARTICIPANT_TYPE.CONTACT;
  }
  return o;
}

function coerceState(raw: unknown): ConversationThreadState | null {
  const s = typeof raw === "string" ? raw : "";
  const parsed = ConversationThreadStateSchema.safeParse(s);
  return parsed.success ? parsed.data : null;
}

function coerceParticipantType(raw: unknown): ParticipantType {
  return raw === PARTICIPANT_TYPE.AGENT ? PARTICIPANT_TYPE.AGENT : PARTICIPANT_TYPE.CONTACT;
}

/** Canonical conversation thread (includes document id). */
export const ConversationThreadSchema = z.object({
  id: z.string().min(1),
  participantId: z.string().min(1),
  participantType: ParticipantTypeSchema,
  searchId: z.string().nullable(),
  outreachId: z.string().nullable(),
  channel: z.enum([CHANNEL.WHATSAPP]),
  state: ConversationThreadStateSchema,
  lastInboundAt: TimestampOrNullOptional,
  lastOutboundAt: TimestampOrNullOptional,
  lastMessageText: z.string().nullable(),
  provisionalPropertySummary: z.string().nullable().optional(),
  createdAt: TimestampOrNullOptional,
  updatedAt: TimestampOrNullOptional,
});

export type ConversationThread = z.infer<typeof ConversationThreadSchema>;

export function parseConversationThreadFromFirestore(
  id: string,
  data: Record<string, unknown>,
): ConversationThread | null {
  const pre = preprocessConversationThreadDocument(data);
  const participantId = typeof pre["participantId"] === "string" ? pre["participantId"] : "";
  if (!participantId) {
    return null;
  }
  const state = coerceState(pre["state"]);
  if (!state) {
    return null;
  }
  const channelRaw = pre["channel"];
  if (channelRaw !== undefined && channelRaw !== null && channelRaw !== CHANNEL.WHATSAPP) {
    return null;
  }

  function fsStringOrNull(v: unknown): string | null {
    if (v === undefined || v === null) {
      return null;
    }
    const s = typeof v === "string" ? v : String(v);
    return s.trim().length > 0 ? s : null;
  }

  const merged = {
    id,
    participantId,
    participantType: coerceParticipantType(pre["participantType"]),
    searchId: fsStringOrNull(pre["searchId"]),
    outreachId: fsStringOrNull(pre["outreachId"]),
    channel: CHANNEL.WHATSAPP,
    state,
    lastInboundAt: pre["lastInboundAt"],
    lastOutboundAt: pre["lastOutboundAt"],
    lastMessageText:
      pre["lastMessageText"] === undefined || pre["lastMessageText"] === null
        ? null
        : String(pre["lastMessageText"]),
    provisionalPropertySummary:
      pre["provisionalPropertySummary"] === undefined
        ? undefined
        : pre["provisionalPropertySummary"] === null
          ? null
          : String(pre["provisionalPropertySummary"]),
    createdAt: pre["createdAt"],
    updatedAt: pre["updatedAt"],
  };

  const parsed = ConversationThreadSchema.safeParse(merged);
  return parsed.success ? parsed.data : null;
}

/** Payload for creating a distribution thread (logical fields; repo adds server timestamps). */
export const ConversationThreadDistributionCreateSchema = z.object({
  participantId: z.string().min(1),
  participantType: ParticipantTypeSchema,
  searchId: z.string().min(1),
  outreachId: z.string().min(1),
  channel: z.enum([CHANNEL.WHATSAPP]),
  state: ConversationThreadStateSchema,
  lastMessageText: z.string().min(1),
});

export type ConversationThreadDistributionCreate = z.infer<typeof ConversationThreadDistributionCreateSchema>;

export const ConversationThreadPatchSchema = z
  .object({
    state: ConversationThreadStateSchema.optional(),
    lastMessageText: z.string().optional(),
    searchId: z.string().optional(),
    outreachId: z.string().optional(),
    provisionalPropertySummary: z.union([z.string(), z.null()]).optional(),
  })
  .strict();

export type ConversationThreadPatchValidated = z.infer<typeof ConversationThreadPatchSchema>;
