import "dotenv/config";
import { buildApp } from "./app.js";
import { loadEnv } from "./env.js";
import { initFirebaseAdmin } from "../modules/shared/firebase/admin.js";
import { createLogger } from "../modules/shared/logger/logger.js";

const log = createLogger("server");

async function main() {
  const env = loadEnv();
  initFirebaseAdmin({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY,
  });

  const app = await buildApp();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  log.info("listening", { port: env.PORT });
}

main().catch((err) => {
  log.error("fatal", { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
