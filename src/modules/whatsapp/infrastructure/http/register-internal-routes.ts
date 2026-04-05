import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getEnv } from "../../../../app/env.js";
import { distributeSearchToNetwork } from "../../application/distribute-search-to-network.js";
import type { SearchDistributionDeps } from "../../application/ports.js";
import { createLogger } from "../../../shared/logger/logger.js";

const log = createLogger("http-internal");

type DistributeParams = { Params: { searchId: string } };

export function registerInternalRoutes(app: FastifyInstance, deps: SearchDistributionDeps): void {
  app.post(
    "/internal/searches/:searchId/distribute",
    async (request: FastifyRequest<DistributeParams>, reply: FastifyReply) => {
      const env = getEnv();
      if (env.INTERNAL_DISTRIBUTE_SECRET) {
        const header = request.headers["x-hommi-internal-secret"];
        if (header !== env.INTERNAL_DISTRIBUTE_SECRET) {
          return reply.code(401).send({ error: "unauthorized" });
        }
      }

      const searchId = request.params["searchId"]?.trim() ?? "";
      if (!searchId) {
        return reply.code(400).send({ error: "missing_search_id" });
      }

      try {
        const result = await distributeSearchToNetwork(deps, searchId);
        const status = result.ok
          ? 200
          : result.error === "search_not_found"
            ? 404
            : result.error === "search_document_invalid"
              ? 422
              : 400;
        return reply.code(status).send(result);
      } catch (err) {
        log.error("distributeSearchToNetwork threw", {
          searchId,
          message: err instanceof Error ? err.message : String(err),
        });
        return reply.code(500).send({ error: "internal_error", searchId });
      }
    },
  );

  log.info("internal routes registered", { path: "/internal/searches/:searchId/distribute" });
}
