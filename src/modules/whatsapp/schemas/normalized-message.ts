export type NormalizedIncomingWhatsAppMessage = {
  from: string;
  messageId: string;
  text: string | null;
  timestamp: string | null;
  rawType: string;
};

export type NormalizedWebhookPayload = {
  messages: NormalizedIncomingWhatsAppMessage[];
};
