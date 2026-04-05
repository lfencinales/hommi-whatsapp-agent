import { z } from "zod";
import { isFirestoreTimestamp } from "./firestore-common.js";
import type { Timestamp } from "firebase-admin/firestore";

const TimestampOrNullOptional = z
  .union([z.custom<Timestamp>(isFirestoreTimestamp), z.null(), z.undefined()])
  .transform((v): Timestamp | null => (v === undefined ? null : v));

export const ContactSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().nullable().optional(),
  agencyName: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  directoryStatus: z.string().nullable().optional(),
  isPaused: z.boolean().optional(),
  propertyTypes: z.unknown().optional(),
  operationTypes: z.unknown().optional(),
  zones: z.unknown().optional(),
  tags: z.unknown().optional(),
  responseStats: z.record(z.unknown()).nullable().optional(),
  createdAt: TimestampOrNullOptional,
  updatedAt: TimestampOrNullOptional,
});

export type Contact = z.infer<typeof ContactSchema>;

function optString(v: unknown): string | undefined {
  if (v === undefined || v === null) {
    return undefined;
  }
  if (typeof v === "string") {
    return v.length > 0 ? v : undefined;
  }
  return undefined;
}

function recordOrNull(v: unknown): Record<string, unknown> | null | undefined {
  if (v === undefined) {
    return undefined;
  }
  if (v === null) {
    return null;
  }
  if (typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return undefined;
}

export function parseContactFromFirestore(id: string, data: Record<string, unknown>): Contact | null {
  const merged = {
    id,
    fullName: optString(data["fullName"]),
    agencyName: optString(data["agencyName"]),
    city: optString(data["city"]),
    phone: optString(data["phone"]),
    whatsapp: optString(data["whatsapp"]),
    directoryStatus: optString(data["directoryStatus"]),
    isPaused: typeof data["isPaused"] === "boolean" ? data["isPaused"] : undefined,
    propertyTypes: data["propertyTypes"],
    operationTypes: data["operationTypes"],
    zones: data["zones"],
    tags: data["tags"],
    responseStats: recordOrNull(data["responseStats"]),
    createdAt: data["createdAt"],
    updatedAt: data["updatedAt"],
  };
  const parsed = ContactSchema.safeParse(merged);
  return parsed.success ? parsed.data : null;
}
