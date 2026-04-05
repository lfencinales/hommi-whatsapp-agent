import { z } from "zod";
import { isFirestoreTimestamp } from "./firestore-common.js";
import type { Timestamp } from "firebase-admin/firestore";

const TimestampOrNullOptional = z
  .union([z.custom<Timestamp>(isFirestoreTimestamp), z.null(), z.undefined()])
  .transform((v): Timestamp | null => (v === undefined ? null : v));

export const AgentSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().nullable().optional(),
  agencyName: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  zones: z.unknown().optional(),
  propertyTypes: z.unknown().optional(),
  operationTypes: z.unknown().optional(),
  strata: z.unknown().optional(),
  tags: z.unknown().optional(),
  preferences: z.unknown().optional(),
  directoryStatus: z.string().nullable().optional(),
  accountStatus: z.string().nullable().optional(),
  otpVerified: z.boolean().optional(),
  createdAt: TimestampOrNullOptional,
  updatedAt: TimestampOrNullOptional,
});

export type Agent = z.infer<typeof AgentSchema>;

function optString(v: unknown): string | undefined {
  if (v === undefined || v === null) {
    return undefined;
  }
  if (typeof v === "string") {
    return v.length > 0 ? v : undefined;
  }
  return undefined;
}

export function parseAgentFromFirestore(id: string, data: Record<string, unknown>): Agent | null {
  const merged = {
    id,
    fullName: optString(data["fullName"]),
    agencyName: optString(data["agencyName"]),
    city: optString(data["city"]),
    phone: optString(data["phone"]),
    whatsapp: optString(data["whatsapp"]),
    email: optString(data["email"]),
    instagram: optString(data["instagram"]),
    zones: data["zones"],
    propertyTypes: data["propertyTypes"],
    operationTypes: data["operationTypes"],
    strata: data["strata"],
    tags: data["tags"],
    preferences: data["preferences"],
    directoryStatus: optString(data["directoryStatus"]),
    accountStatus: optString(data["accountStatus"]),
    otpVerified: typeof data["otpVerified"] === "boolean" ? data["otpVerified"] : undefined,
    createdAt: data["createdAt"],
    updatedAt: data["updatedAt"],
  };
  const parsed = AgentSchema.safeParse(merged);
  return parsed.success ? parsed.data : null;
}
