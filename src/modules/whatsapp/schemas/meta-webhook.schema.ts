import { z } from "zod";

const textBodySchema = z.object({
  body: z.string(),
});

export const metaIncomingMessageSchema = z
  .object({
    from: z.string(),
    id: z.string(),
    timestamp: z.string().optional(),
    type: z.string(),
    text: textBodySchema.optional(),
  })
  .passthrough();

export const metaWebhookValueSchema = z
  .object({
    messaging_product: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    messages: z.array(metaIncomingMessageSchema).optional(),
  })
  .passthrough();

export const metaWebhookChangeSchema = z
  .object({
    field: z.string().optional(),
    value: metaWebhookValueSchema,
  })
  .passthrough();

export const metaWebhookEntrySchema = z
  .object({
    id: z.string().optional(),
    changes: z.array(metaWebhookChangeSchema),
  })
  .passthrough();

export const metaWebhookBodySchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(metaWebhookEntrySchema),
});

export type MetaWebhookBody = z.infer<typeof metaWebhookBodySchema>;
