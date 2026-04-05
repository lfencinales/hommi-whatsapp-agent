import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { HandleIncomingWebhookResult } from "../../application/handle-incoming-webhook.js";
import { mapMetaWebhookToNormalized } from "../../schemas/map-meta-webhook.js";
import { metaWebhookBodySchema } from "../../schemas/meta-webhook.schema.js";
import type { NormalizedWebhookPayload } from "../../schemas/normalized-message.js";
import { createLogger } from "../../../shared/logger/logger.js";
import { verifyWebhookMode } from "../meta-whatsapp-client.js";

const log = createLogger("http-webhook");

type HubQuery = {
  "hub.mode"?: string;
  "hub.challenge"?: string;
  "hub.verify_token"?: string;
};

export function registerWebhookRoutes(
  app: FastifyInstance,
  deps: {
    metaVerifyToken: string;
    handleIncoming: (payload: NormalizedWebhookPayload) => Promise<HandleIncomingWebhookResult>;
  },
): void {
  app.get("/webhook", (request: FastifyRequest<{ Querystring: HubQuery }>, reply: FastifyReply) => {
    const result = verifyWebhookMode(
      {
        mode: request.query["hub.mode"],
        challenge: request.query["hub.challenge"],
        verifyToken: request.query["hub.verify_token"],
      },
      deps.metaVerifyToken,
    );

    if (!result.ok) {
      log.warn("webhook verification failed", { reason: result.reason });
      return reply.code(403).send("Forbidden");
    }

    log.info("webhook verified");
    return reply.code(200).send(result.challenge);
  });

  app.post("/webhook", async (request, reply) => {
    const parsed = metaWebhookBodySchema.safeParse(request.body);
    if (!parsed.success) {
      log.warn("invalid webhook payload", { issues: parsed.error.flatten() });
      return reply.code(400).send({ error: "invalid_payload" });
    }

    const normalized = mapMetaWebhookToNormalized(parsed.data);
    log.debug("webhook parsed", {
      rawEntries: parsed.data.entry.length,
      normalizedCount: normalized.messages.length,
    });

    const outcome = await deps.handleIncoming(normalized);
    log.info("webhook handled", {
      accepted: outcome.accepted,
      handled: outcome.handled,
      skipped: outcome.skipped,
    });

    return reply.code(200).send({
      ok: true,
      accepted: outcome.accepted,
      handled: outcome.handled,
      skipped: outcome.skipped,
    });
  });
}
