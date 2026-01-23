/**
 * Lumier - Infrastructure as Code for Cloudflare Workers
 *
 * This is the main public export file. Import from "lumier" to access all
 * resource functions and types.
 *
 * @example
 * ```ts
 * import { $config, Worker, Bucket, KV, D1, Queue } from "lumier";
 *
 * export default $config({
 *   app() {
 *     return { name: "my-app", protect: ["production"] };
 *   },
 *   async run(ctx) {
 *     const bucket = Bucket("uploads");
 *     const db = D1("database");
 *     const cache = KV("cache");
 *
 *     const api = Worker("api", {
 *       entry: "src/api.ts",
 *       url: true,
 *       bindings: {
 *         UPLOADS: bucket,
 *         DB: db,
 *         CACHE: cache,
 *         STAGE: ctx.stage,
 *         API_KEY: { type: "secret_text", value: ctx.secrets.API_KEY },
 *       },
 *     });
 *
 *     return { url: api.url };
 *   },
 * });
 * ```
 */
/** biome-ignore-all lint/suspicious/noEmptyInterface: shut up! */
/** biome-ignore-all lint/performance/noBarrelFile: shut up! */

// Re-export Binding type from config
export type {
  Binding,
  ExistingD1Options,
  ExistingHyperdriveOptions,
  ExistingKVOptions,
  ExistingQueueOptions,
  ExistingR2Options,
  ExistingVectorizeOptions,
  SecretOutput,
} from "./config.js";
// Resource functions
export {
  $config,
  AnalyticsEngine,
  Bucket,
  binding,
  Cron,
  clearRegistry,
  D1,
  DurableObject,
  getRegistry,
  Hyperdrive,
  KV,
  Queue,
  ResourceNameSchema,
  Secret,
  StaticSite,
  Vectorize,
  Worker,
} from "./config.js";

// Types
export type {
  AnalyticsEngineOptions,
  AnalyticsEngineOutput,
  AppConfig,
  AppInput,
  BindingValue,
  BucketOptions,
  BucketOutput,
  BuildOptions,
  ConfigOptions,
  CronOptions,
  CronOutput,
  D1Options,
  D1Output,
  DurableObjectOptions,
  DurableObjectOutput,
  HyperdriveOptions,
  HyperdriveOutput,
  KVOptions,
  KVOutput,
  LinkableResource,
  ManualBinding,
  QueueOptions,
  QueueOutput,
  ResourceRegistry,
  RuntimeContext,
  StaticSiteOptions,
  StaticSiteOutput,
  VectorizeOptions,
  VectorizeOutput,
  WorkerOptions,
  WorkerOutput,
} from "./types.js";

// ============================================================================
// Env Interface (augmented by lumier-env.d.ts)
// ============================================================================

/**
 * Worker environment bindings.
 *
 * **Recommended:** Use `import { env } from 'cloudflare:workers'` instead.
 * The lumier-env.d.ts file augments the `cloudflare:workers` module automatically.
 *
 * @example Modern approach (recommended):
 * ```ts
 * import { env } from 'cloudflare:workers';
 *
 * export default {
 *   async fetch(request: Request): Promise<Response> {
 *     // env.DB, env.CACHE, etc. are fully typed
 *     const data = await env.DB.prepare('SELECT * FROM users').all();
 *     return Response.json(data);
 *   },
 * };
 * ```
 *
 * @example Traditional handler pattern (still supported):
 * ```ts
 * export default {
 *   async fetch(request: Request, env: CloudflareEnv): Promise<Response> {
 *     // env.UPLOADS, env.DB, etc. are fully typed
 *     return new Response("Hello!");
 *   },
 * };
 * ```
 *
 * @deprecated Use `import { env } from 'cloudflare:workers'` instead
 */
export interface Env {}
