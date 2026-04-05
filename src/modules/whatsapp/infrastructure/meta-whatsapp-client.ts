import { getEnv } from "../../../app/env.js";
import { createLogger } from "../../shared/logger/logger.js";
import type { SendTextMessageResult } from "../../shared/types/whatsapp-send-result.js";

const log = createLogger("meta-whatsapp");

const SUBSCRIBE_MODE = "subscribe";

export type WebhookVerificationParams = {
  mode: string | undefined;
  challenge: string | undefined;
  verifyToken: string | undefined;
};

export type WebhookVerificationResult =
  | { ok: true; challenge: string }
  | { ok: false; reason: string };

export function verifyWebhookMode(
  params: WebhookVerificationParams,
  expectedVerifyToken: string,
): WebhookVerificationResult {
  if (params.mode !== SUBSCRIBE_MODE) {
    return { ok: false, reason: "invalid_mode" };
  }
  if (!params.verifyToken || params.verifyToken !== expectedVerifyToken) {
    return { ok: false, reason: "invalid_verify_token" };
  }
  if (!params.challenge) {
    return { ok: false, reason: "missing_challenge" };
  }
  return { ok: true, challenge: params.challenge };
}

export type { SendTextMessageResult } from "../../shared/types/whatsapp-send-result.js";

export function createMetaWhatsAppClient() {
  const env = getEnv();
  const graphVersion = env.META_GRAPH_API_VERSION.replace(/^v?/, "v");
  const baseUrl = `https://graph.facebook.com/${graphVersion}/${env.META_PHONE_NUMBER_ID}/messages`;

  return {
    async sendTextMessage(to: string, body: string): Promise<SendTextMessageResult> {
      try {
        const res = await fetch(baseUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { preview_url: false, body },
          }),
        });
        const json = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          log.warn("sendTextMessage failed", { status: res.status, json });
          return { ok: false, error: JSON.stringify(json), status: res.status };
        }
        const messages = json["messages"] as Array<{ id?: string }> | undefined;
        const messageId = messages?.[0]?.id;
        if (messageId !== undefined) {
          return { ok: true, messageId };
        }
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error("sendTextMessage error", { message });
        return { ok: false, error: message };
      }
    },
  };
}

export type MetaWhatsAppClient = ReturnType<typeof createMetaWhatsAppClient>;
