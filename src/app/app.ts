import Fastify from "fastify";
import { getEnv } from "./env.js";
import { registerWebhookRoutes } from "../modules/whatsapp/infrastructure/http/register-webhook-routes.js";
import { registerInternalRoutes } from "../modules/whatsapp/infrastructure/http/register-internal-routes.js";
import { createLogger } from "../modules/shared/logger/logger.js";
import { getFirestore } from "../modules/shared/firebase/admin.js";
import { handleIncomingWhatsAppWebhook } from "../modules/whatsapp/application/handle-incoming-webhook.js";
import type { InboundWhatsAppDeps, SearchDistributionDeps } from "../modules/whatsapp/application/ports.js";
import { AgentsRepository } from "../modules/whatsapp/infrastructure/persistence/agents-repository.js";
import { ContactsRepository } from "../modules/whatsapp/infrastructure/persistence/contacts-repository.js";
import { ConversationThreadsRepository } from "../modules/whatsapp/infrastructure/persistence/conversation-threads-repository.js";
import { MatchesRepository } from "../modules/whatsapp/infrastructure/persistence/matches-repository.js";
import { NetworkMembersRepository } from "../modules/whatsapp/infrastructure/persistence/network-members-repository.js";
import { OutreachRepository } from "../modules/whatsapp/infrastructure/persistence/outreach-repository.js";
import { ResponsesRepository } from "../modules/whatsapp/infrastructure/persistence/responses-repository.js";
import { SearchesRepository } from "../modules/whatsapp/infrastructure/persistence/searches-repository.js";
import { createMetaWhatsAppClient } from "../modules/whatsapp/infrastructure/meta-whatsapp-client.js";

const log = createLogger("app");

export async function buildApp() {
  const env = getEnv();
  const app = Fastify({
    logger: false,
    requestIdHeader: "x-request-id",
    disableRequestLogging: true,
  });

  app.get("/health", async () => ({ status: "ok" }));

  const db = getFirestore();
  const contactsRepo = new ContactsRepository(db);
  const agentsRepo = new AgentsRepository(db);
  const networkMembersRepo = new NetworkMembersRepository(contactsRepo, agentsRepo);
  const threadsRepo = new ConversationThreadsRepository(db);
  const outreachRepo = new OutreachRepository(db);
  const searchesRepo = new SearchesRepository(db);
  const responsesRepo = new ResponsesRepository(db);
  const matchesRepo = new MatchesRepository(db);
  const metaClient = createMetaWhatsAppClient();

  const inboundDeps: InboundWhatsAppDeps = {
    networkMembers: networkMembersRepo,
    threads: threadsRepo,
    outreach: outreachRepo,
    agents: agentsRepo,
    searches: searchesRepo,
    responses: responsesRepo,
    matches: matchesRepo,
    messaging: metaClient,
  };

  registerWebhookRoutes(app, {
    metaVerifyToken: env.META_VERIFY_TOKEN,
    handleIncoming: (payload) => handleIncomingWhatsAppWebhook(payload, inboundDeps),
  });

  const distributionDeps: SearchDistributionDeps = {
    searches: searchesRepo,
    agents: agentsRepo,
    contacts: contactsRepo,
    threads: threadsRepo,
    outreach: outreachRepo,
    messaging: metaClient,
  };
  registerInternalRoutes(app, distributionDeps);

  app.addHook("onReady", async () => {
    log.info("server ready", { port: env.PORT, nodeEnv: env.NODE_ENV });
  });

  return app;
}
