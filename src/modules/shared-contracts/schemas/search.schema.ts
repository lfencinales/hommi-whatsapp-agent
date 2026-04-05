import { z } from "zod";
import { SEARCH_STATUS, SearchStatusSchema } from "../enums.js";
import { isFirestoreTimestamp } from "./firestore-common.js";
import type { Timestamp } from "firebase-admin/firestore";

const TimestampOrNullOptional = z
  .union([z.custom<Timestamp>(isFirestoreTimestamp), z.null(), z.undefined()])
  .transform((v): Timestamp | null => (v === undefined ? null : v));

export const SearchSchema = z.object({
  id: z.string().min(1),
  agentId: z.string().nullable(),
  rawText: z.string().nullable(),
  parsedData: z.record(z.unknown()).nullable().optional(),
  commissionScheme: z.unknown().nullable().optional(),
  status: SearchStatusSchema,
  expiresAt: TimestampOrNullOptional,
  detectedChips: z.unknown().optional(),
  missingSuggestions: z.unknown().optional(),
  qualityLabel: z.string().nullable().optional(),
  duplicateFingerprint: z.string().nullable().optional(),
  createdAt: TimestampOrNullOptional,
  updatedAt: TimestampOrNullOptional,
});

export type Search = z.infer<typeof SearchSchema>;

function nullableString(v: unknown): string | null {
  if (v === undefined || v === null) {
    return null;
  }
  if (typeof v === "string") {
    return v.length > 0 ? v : null;
  }
  return null;
}

function recordOrNull(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

/** Accept only real Firestore Timestamps; otherwise null (lenient reads for legacy / bad writes). */
function timestampFieldOrNull(v: unknown): Timestamp | null {
  if (v === undefined || v === null) {
    return null;
  }
  return isFirestoreTimestamp(v) ? v : null;
}

export function parseSearchFromFirestore(id: string, data: Record<string, unknown>): Search | null {
  let rawStatus = data["status"] ?? "active";
  /** Legacy value written before status enum was canonicalized. */
  if (rawStatus === "matched") {
    rawStatus = SEARCH_STATUS.CLOSED;
  }
  const statusParsed = SearchStatusSchema.safeParse(rawStatus);
  const status = statusParsed.success ? statusParsed.data : SEARCH_STATUS.ACTIVE;
  const merged = {
    id,
    agentId: nullableString(data["agentId"]),
    rawText: nullableString(data["rawText"]),
    parsedData: recordOrNull(data["parsedData"]),
    commissionScheme: data["commissionScheme"] === undefined ? null : data["commissionScheme"],
    status,
    expiresAt: timestampFieldOrNull(data["expiresAt"]),
    detectedChips: data["detectedChips"],
    missingSuggestions: data["missingSuggestions"],
    qualityLabel: nullableString(data["qualityLabel"]),
    duplicateFingerprint: nullableString(data["duplicateFingerprint"]),
    createdAt: timestampFieldOrNull(data["createdAt"]),
    updatedAt: timestampFieldOrNull(data["updatedAt"]),
  };
  const parsed = SearchSchema.safeParse(merged);
  return parsed.success ? parsed.data : null;
}

export const SearchStatusUpdateSchema = z.object({
  status: SearchStatusSchema,
});
