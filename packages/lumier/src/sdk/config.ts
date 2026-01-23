/**
 * Lumier Configuration & Resource Functions
 *
 * This is the main user-facing API for defining infrastructure.
 *
 * @example
 * ```ts
 * import { $config, Worker, Bucket, KV, D1 } from 'lumiere';
 *
 * export default $config({
 *   app() {
 *     return { name: 'my-app', protect: ['production'] };
 *   },
 *   async run(ctx) {
 *     const bucket = Bucket('uploads');
 *     const db = D1('database');
 *     const api = Worker('api', {
 *       entry: 'src/api.ts',
 *       url: true,
 *       bindings: {
 *         UPLOADS: bucket,
 *         DB: db,
 *         STAGE: ctx.stage,
 *       },
 *     });
 *     return { url: api.url };
 *   },
 * });
 * ```
 */

import * as z from "zod";

import type {
  AnalyticsEngineOptions,
  AnalyticsEngineOutput,
  BucketOptions,
  BucketOutput,
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
  QueueOptions,
  QueueOutput,
  ResourceRegistry,
  StaticSiteOptions,
  StaticSiteOutput,
  VectorizeOptions,
  VectorizeOutput,
  WorkerOptions,
  WorkerOutput,
} from "./types.js";

// ============================================================================
// Validation
// ============================================================================

export const ResourceNameSchema = z
  .string()
  .trim()
  .min(1, "Resource name cannot be empty")
  .max(63, "Resource name cannot exceed 63 characters")
  .regex(
    /^[a-z][a-z0-9-]*$/i,
    "Resource name must start with a letter and contain only alphanumeric characters and hyphens"
  );

function validateName(name: string, type: string): void {
  const result = ResourceNameSchema.safeParse(name);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`${type} "${name}": ${issue?.message ?? "Invalid name"}`);
  }
}

// ============================================================================
// Internal Registry (uses globalThis to share across module instances)
// ============================================================================

const REGISTRY_KEY = "__lumier_registry__";

function createEmptyRegistry(): ResourceRegistry {
  return {
    app: { name: "", stage: "" },
    workers: [],
    buckets: [],
    kvs: [],
    d1s: [],
    queues: [],
    vectorizes: [],
    durableObjects: [],
    crons: [],
    staticSites: [],
    hyperdrives: [],
    analyticsEngines: [],
    outputs: {},
  };
}

// Use globalThis to ensure registry is shared across all module instances
if (!(globalThis as Record<string, unknown>)[REGISTRY_KEY]) {
  (globalThis as Record<string, unknown>)[REGISTRY_KEY] = createEmptyRegistry();
}

function getRegistryInternal(): ResourceRegistry {
  return (globalThis as Record<string, unknown>)[REGISTRY_KEY] as ResourceRegistry;
}

/**
 * Clear registry (for hot reload)
 */
export function clearRegistry(): void {
  const registry = getRegistryInternal();
  registry.app = { name: "", stage: "" };
  registry.workers = [];
  registry.buckets = [];
  registry.kvs = [];
  registry.d1s = [];
  registry.queues = [];
  registry.vectorizes = [];
  registry.durableObjects = [];
  registry.crons = [];
  registry.staticSites = [];
  registry.hyperdrives = [];
  registry.analyticsEngines = [];
  registry.outputs = {};
}

/**
 * Get internal registry (used by CLI)
 * @internal This is for CLI use only - do not use in user code
 */
export function getRegistry(): ResourceRegistry {
  return getRegistryInternal();
}

// ============================================================================
// Resource Functions
// ============================================================================

/**
 * Create a Cloudflare Worker
 *
 * @example
 * ```ts
 * const api = Worker('api', {
 *   entry: 'src/api.ts',
 *   url: true,
 *   bindings: { STAGE: ctx.stage },
 * });
 * ```
 */
export function Worker(name: string, options: WorkerOptions): WorkerOutput {
  validateName(name, "Worker");
  const registry = getRegistryInternal();
  registry.workers.push({ name, options });

  // Script name includes stage for workers.dev URL
  const scriptName = registry.app.stage
    ? `${registry.app.name}-${registry.app.stage}-${name}`
    : `${registry.app.name}-${name}`;

  return {
    type: "worker",
    name,
    url: `https://${scriptName}.workers.dev`,
    _ref: { scriptName },
  };
}

/**
 * Create an R2 Bucket
 *
 * @example
 * ```ts
 * const uploads = Bucket('uploads');
 * ```
 */
export function Bucket(name: string, options?: BucketOptions): BucketOutput {
  validateName(name, "Bucket");
  getRegistryInternal().buckets.push({ name, options });

  return {
    type: "bucket",
    name,
    _ref: { bucketName: name },
  };
}

/**
 * Create a KV Namespace
 *
 * @example
 * ```ts
 * const cache = KV('cache');
 * ```
 */
export function KV(name: string, options?: KVOptions): KVOutput {
  validateName(name, "KV");
  getRegistryInternal().kvs.push({ name, options });

  return {
    type: "kv",
    name,
    namespaceId: `kv-${name}`,
    _ref: { namespaceId: `kv-${name}` },
  };
}

/**
 * Create a D1 Database
 *
 * @example
 * ```ts
 * const db = D1('database');
 * ```
 */
export function D1(name: string, options?: D1Options): D1Output {
  validateName(name, "D1");
  getRegistryInternal().d1s.push({ name, options });

  return {
    type: "d1",
    name,
    databaseId: `d1-${name}`,
    _ref: { id: `d1-${name}` },
  };
}

/**
 * Create a Queue
 *
 * @example
 * ```ts
 * const jobs = Queue('jobs', {
 *   consumer: { worker: api, settings: { batchSize: 10 } },
 * });
 * ```
 */
export function Queue(name: string, options?: QueueOptions): QueueOutput {
  validateName(name, "Queue");
  getRegistryInternal().queues.push({ name, options });

  return {
    type: "queue",
    name,
    _ref: { queueName: name },
  };
}

/**
 * Create a Vectorize Index
 *
 * @example
 * ```ts
 * const embeddings = Vectorize('embeddings', {
 *   dimensions: 1536,
 *   metric: 'cosine',
 * });
 * ```
 */
export function Vectorize(name: string, options: VectorizeOptions): VectorizeOutput {
  validateName(name, "Vectorize");
  getRegistryInternal().vectorizes.push({ name, options });

  return {
    type: "vectorize",
    name,
    _ref: { indexName: name },
  };
}

/**
 * Create a Durable Object Namespace
 *
 * @example
 * ```ts
 * const rooms = DurableObject('rooms', {
 *   worker: api,
 *   className: 'ChatRoom',
 * });
 * ```
 */
export function DurableObject(name: string, options: DurableObjectOptions): DurableObjectOutput {
  validateName(name, "DurableObject");
  getRegistryInternal().durableObjects.push({ name, options });

  return {
    type: "durable_object",
    name,
    className: options.className,
    _ref: { className: options.className, scriptName: options.worker._ref.scriptName },
  };
}

/**
 * Create a Cron Trigger
 *
 * @example
 * ```ts
 * Cron('daily-cleanup', {
 *   worker: api,
 *   schedule: '0 0 * * *',
 * });
 * ```
 */
export function Cron(name: string, options: CronOptions): CronOutput {
  validateName(name, "Cron");
  getRegistryInternal().crons.push({ name, options });

  return {
    type: "cron",
    name,
    schedule: options.schedule,
  };
}

/**
 * Create a Static Site
 *
 * @example
 * ```ts
 * const site = StaticSite('web', {
 *   path: './packages/web/dist',
 *   domain: 'example.com',
 * });
 * ```
 */
export function StaticSite(name: string, options: StaticSiteOptions): StaticSiteOutput {
  validateName(name, "StaticSite");
  const registry = getRegistryInternal();
  registry.staticSites.push({ name, options });

  // Build site name with stage for workers.dev URL
  const siteName = registry.app.stage
    ? `${registry.app.name}-${registry.app.stage}-${name}`
    : `${registry.app.name}-${name}`;

  return {
    type: "static_site",
    name,
    url: options.domain ? `https://${options.domain}` : `https://${siteName}.workers.dev`,
  };
}

/**
 * Create a Hyperdrive connection pool
 *
 * The Hyperdrive config ID is auto-generated by Pulumi during deploy.
 * For dev, provide localConnectionString to connect directly to your database.
 *
 * @example
 * ```ts
 * const pg = Hyperdrive('postgres', {
 *   localConnectionString: 'postgres://localhost:5432/mydb',
 * });
 * ```
 */
export function Hyperdrive(name: string, options?: HyperdriveOptions): HyperdriveOutput {
  validateName(name, "Hyperdrive");
  getRegistryInternal().hyperdrives.push({ name, options });

  return {
    type: "hyperdrive",
    name,
    _ref: { id: `hyperdrive-${name}`, localConnectionString: options?.localConnectionString },
  };
}

/**
 * Create an Analytics Engine dataset
 *
 * @example
 * ```ts
 * const analytics = AnalyticsEngine('events');
 * ```
 */
export function AnalyticsEngine(name: string, options?: AnalyticsEngineOptions): AnalyticsEngineOutput {
  validateName(name, "AnalyticsEngine");
  getRegistryInternal().analyticsEngines.push({ name, options });

  return {
    type: "analytics_engine",
    name,
    _ref: { dataset: name },
  };
}

// ============================================================================
// Secret Function
// ============================================================================

/**
 * Secret output - represents a secret binding value
 */
export interface SecretOutput {
  readonly type: "secret";
  readonly name: string;
  readonly placeholder?: string;
  readonly _ref: { isSecret: true };
}

/**
 * Create a secret binding for Workers
 *
 * Secrets are encrypted at rest and not visible in the dashboard.
 * Set secrets via CLI with `lumier secret set`, or provide a
 * placeholder for development.
 *
 * @param name - The secret name (must match CLI secret name)
 * @param placeholder - Optional placeholder value for development
 *
 * @example
 * ```ts
 * // Required secret (throws if not set via CLI)
 * const api = Worker('api', {
 *   entry: 'src/api.ts',
 *   bindings: {
 *     API_KEY: Secret('API_KEY'),
 *   }
 * })
 *
 * // With a development placeholder
 * const api = Worker('api', {
 *   entry: 'src/api.ts',
 *   bindings: {
 *     API_KEY: Secret('API_KEY', 'dev-placeholder'),
 *   }
 * })
 * ```
 */
export function Secret(name: string, placeholder?: string): SecretOutput {
  return {
    type: "secret",
    name,
    placeholder: placeholder || undefined,
    _ref: { isSecret: true },
  };
}

// ============================================================================
// Config Function
// ============================================================================

/**
 * Define your Lumiere configuration
 *
 * @example
 * ```ts
 * export default $config({
 *   app(input) {
 *     return {
 *       name: 'my-app',
 *       protect: ['production'],
 *       removal: input?.stage === 'production' ? 'retain' : 'remove',
 *     };
 *   },
 *   async run(ctx) {
 *     const api = Worker('api', { entry: 'src/api.ts', url: true });
 *     return { url: api.url };
 *   },
 * });
 * ```
 */
export function $config(options: ConfigOptions): ConfigOptions & { _lumier: true } {
  return { ...options, _lumier: true };
}

// ============================================================================
// Binding Helper
// ============================================================================

/** All supported binding types */
export type Binding =
  | { type: "plain_text"; name: string; text: string }
  | { type: "secret_text"; name: string; text: string }
  | { type: "kv_namespace"; name: string; namespace_id: string }
  | { type: "d1"; name: string; id: string }
  | { type: "r2_bucket"; name: string; bucket_name: string }
  | { type: "service"; name: string; service: string; entrypoint?: string }
  | { type: "durable_object_namespace"; name: string; class_name: string; script_name?: string }
  | { type: "queue"; name: string; queue_name: string }
  | { type: "ai"; name: string }
  | { type: "vectorize"; name: string; index_name: string }
  | { type: "hyperdrive"; name: string; id: string }
  | { type: "analytics_engine"; name: string; dataset: string }
  | { type: "assets"; name: string }
  | { type: "browser_rendering"; name: string }
  | { type: "version_metadata"; name: string }
  | { type: "mtls_certificate"; name: string; certificate_id: string };

/**
 * Helper to create typed bindings
 *
 * @example
 * ```ts
 * binding({ type: 'plain_text', name: 'STAGE', text: ctx.stage })
 * ```
 */
export function binding<T extends Binding>(config: T): T {
  return config;
}

// ============================================================================
// Existing Resource Functions (Import existing resources)
// ============================================================================

export interface ExistingD1Options {
  /** Existing D1 database UUID */
  id: string;
}

export interface ExistingKVOptions {
  /** Existing KV namespace ID */
  id: string;
}

export interface ExistingR2Options {
  /** Existing R2 bucket name */
  bucketName: string;
}

export interface ExistingQueueOptions {
  /** Existing queue name */
  queueName: string;
}

export interface ExistingVectorizeOptions {
  /** Existing Vectorize index name */
  indexName: string;
}

export interface ExistingHyperdriveOptions {
  /** Existing Hyperdrive config ID */
  id: string;
}

/**
 * Reference an existing D1 database (not managed by Lumier)
 *
 * Use this when you have a D1 database that was created outside of Lumier
 * (e.g., via wrangler or the dashboard) and want to use it in your Workers.
 *
 * @example
 * ```ts
 * const db = D1.existing('my-db', {
 *   id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
 * });
 * ```
 */
D1.existing = (name: string, options: ExistingD1Options): D1Output => {
  validateName(name, "D1.existing");

  return {
    type: "d1",
    name,
    databaseId: options.id,
    _ref: { id: options.id, existing: true },
  } as D1Output;
};

/**
 * Reference an existing KV namespace (not managed by Lumier)
 *
 * @example
 * ```ts
 * const cache = KV.existing('cache', {
 *   id: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
 * });
 * ```
 */
KV.existing = (name: string, options: ExistingKVOptions): KVOutput => {
  validateName(name, "KV.existing");

  return {
    type: "kv",
    name,
    namespaceId: options.id,
    _ref: { namespaceId: options.id, existing: true },
  } as KVOutput;
};

/**
 * Reference an existing R2 bucket (not managed by Lumier)
 *
 * @example
 * ```ts
 * const uploads = Bucket.existing('uploads', {
 *   bucketName: 'my-existing-bucket',
 * });
 * ```
 */
Bucket.existing = (name: string, options: ExistingR2Options): BucketOutput => {
  validateName(name, "Bucket.existing");

  return {
    type: "bucket",
    name,
    _ref: { bucketName: options.bucketName, existing: true },
  } as BucketOutput;
};

/**
 * Reference an existing Queue (not managed by Lumier)
 *
 * @example
 * ```ts
 * const jobs = Queue.existing('jobs', {
 *   queueName: 'my-existing-queue',
 * });
 * ```
 */
Queue.existing = (name: string, options: ExistingQueueOptions): QueueOutput => {
  validateName(name, "Queue.existing");

  return {
    type: "queue",
    name,
    _ref: { queueName: options.queueName, existing: true },
  } as QueueOutput;
};

/**
 * Reference an existing Vectorize index (not managed by Lumier)
 *
 * @example
 * ```ts
 * const embeddings = Vectorize.existing('embeddings', {
 *   indexName: 'my-existing-index',
 * });
 * ```
 */
Vectorize.existing = (name: string, options: ExistingVectorizeOptions): VectorizeOutput => {
  validateName(name, "Vectorize.existing");

  return {
    type: "vectorize",
    name,
    _ref: { indexName: options.indexName, existing: true },
  } as VectorizeOutput;
};

/**
 * Reference an existing Hyperdrive config (not managed by Lumier)
 *
 * @example
 * ```ts
 * const pg = Hyperdrive.existing('postgres', {
 *   id: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
 * });
 * ```
 */
Hyperdrive.existing = (name: string, options: ExistingHyperdriveOptions): HyperdriveOutput => {
  validateName(name, "Hyperdrive.existing");

  return {
    type: "hyperdrive",
    name,
    _ref: { id: options.id, existing: true },
  } as HyperdriveOutput;
};
