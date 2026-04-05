import { z } from "zod";

function normalizeFirebasePrivateKey(key: string): string {
  return key.replaceAll("\\n", "\n");
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  META_VERIFY_TOKEN: z.string().min(1, "META_VERIFY_TOKEN is required"),
  META_ACCESS_TOKEN: z.string().min(1, "META_ACCESS_TOKEN is required"),
  META_PHONE_NUMBER_ID: z.string().min(1, "META_PHONE_NUMBER_ID is required"),
  /** Graph API version segment, e.g. v21.0 */
  META_GRAPH_API_VERSION: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : String(v).trim()),
    z.string().min(1).default("v21.0"),
  ),
  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_CLIENT_EMAIL: z.string().email("FIREBASE_CLIENT_EMAIL must be a valid email"),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .min(1, "FIREBASE_PRIVATE_KEY is required")
    .transform(normalizeFirebasePrivateKey),
  /** If set, POST /internal/searches/:id/distribute requires header `x-hommi-internal-secret` with this value. */
  INTERNAL_DISTRIBUTE_SECRET: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function loadEnv(overrides?: Record<string, string | undefined>): Env {
  if (cached && !overrides) {
    return cached;
  }
  const parsed = envSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg, null, 2)}`);
  }
  if (!overrides) {
    cached = parsed.data;
  }
  return parsed.data;
}

export function getEnv(): Env {
  if (!cached) {
    throw new Error("Environment not loaded; call loadEnv() at bootstrap");
  }
  return cached;
}
