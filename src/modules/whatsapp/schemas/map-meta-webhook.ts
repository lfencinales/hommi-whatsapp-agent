import type { MetaWebhookBody } from "./meta-webhook.schema.js";
import type { NormalizedIncomingWhatsAppMessage, NormalizedWebhookPayload } from "./normalized-message.js";

function mapTextMessage(msg: {
  from: string;
  id: string;
  timestamp?: string | undefined;
  type: string;
  text?: { body: string } | undefined;
}): NormalizedIncomingWhatsAppMessage | null {
  if (msg.type !== "text") {
    return null;
  }
  const textBody = msg.text?.body;
  if (textBody === undefined) {
    return null;
  }
  return {
    from: msg.from,
    messageId: msg.id,
    text: textBody,
    timestamp: msg.timestamp ?? null,
    rawType: msg.type,
  };
}

export function mapMetaWebhookToNormalized(body: MetaWebhookBody): NormalizedWebhookPayload {
  const messages: NormalizedIncomingWhatsAppMessage[] = [];
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const incoming = change.value.messages;
      if (!incoming) continue;
      for (const msg of incoming) {
        const normalized = mapTextMessage(msg);
        if (normalized) {
          messages.push(normalized);
        }
      }
    }
  }
  return { messages };
}
