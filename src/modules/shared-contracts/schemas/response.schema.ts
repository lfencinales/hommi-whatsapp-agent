import { z } from "zod";
import { CHANNEL, ParticipantTypeSchema, ResponseStatusSchema } from "../enums.js";

export const StructuredPropertySummarySchema = z.object({
  shortSummary: z.string(),
  extractedHints: z.object({
    bedrooms: z.number().nullable().optional(),
    bathrooms: z.number().nullable().optional(),
    area: z.number().nullable().optional(),
    price: z.number().nullable().optional(),
  }),
});

export type StructuredPropertySummary = z.infer<typeof StructuredPropertySummarySchema>;

export const ResponseSchema = z.object({
  id: z.string().min(1),
  searchId: z.string().nullable(),
  receiverId: z.string().nullable(),
  receiverType: z.string().nullable(),
  interested: z.boolean().optional(),
  propertySummaryRaw: z.string().nullable().optional(),
  propertySummaryStructured: StructuredPropertySummarySchema.nullable().optional(),
  originChannel: z.string().nullable().optional(),
  status: ResponseStatusSchema,
  createdAt: z.unknown().optional(),
});

export type Response = z.infer<typeof ResponseSchema>;

export const ResponseCreateSchema = z.object({
  searchId: z.string().min(1),
  receiverId: z.string().min(1),
  receiverType: ParticipantTypeSchema,
  interested: z.boolean(),
  propertySummaryRaw: z.string().min(1),
  propertySummaryStructured: StructuredPropertySummarySchema,
  originChannel: z.enum([CHANNEL.WHATSAPP]),
  initialStatus: ResponseStatusSchema,
});

export const ResponseStatusUpdateSchema = z.object({
  status: ResponseStatusSchema,
});
