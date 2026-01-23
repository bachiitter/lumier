/**
 * Lumier SDK Type Definitions
 *
 * Public types used by consumers of the SDK.
 */

// ============================================================================
// App Configuration
// ============================================================================

export interface AppInput {
  stage?: string;
}

export type RemovalPolicy = "remove" | "retain" | "retain-all";

export interface AppConfig {
  name: string;
  protect?: string[];
  removal?: RemovalPolicy;
}

export interface RuntimeContext {
  stage: string;
  isProduction: boolean;
  isDev: boolean;
  app: AppConfig;
}

export interface ConfigOptions {
  app: (input?: AppInput) => AppConfig;
  run: (ctx: RuntimeContext) => Record<string, unknown>;
}

// ============================================================================
// Resource Outputs (returned from resource functions)
// ============================================================================

export interface WorkerOutput {
  readonly type: "worker";
  readonly name: string;
  readonly url: string;
  readonly _ref: { scriptName: string };
}

export interface BucketOutput {
  readonly type: "bucket";
  readonly name: string;
  readonly _ref: { bucketName: string; existing?: boolean };
}

export interface KVOutput {
  readonly type: "kv";
  readonly name: string;
  readonly namespaceId: string;
  readonly _ref: { namespaceId: string; existing?: boolean };
}

export interface D1Output {
  readonly type: "d1";
  readonly name: string;
  readonly databaseId: string;
  readonly _ref: { id: string; existing?: boolean };
}

export interface QueueOutput {
  readonly type: "queue";
  readonly name: string;
  readonly _ref: { queueName: string; existing?: boolean };
}

export interface VectorizeOutput {
  readonly type: "vectorize";
  readonly name: string;
  readonly _ref: { indexName: string; existing?: boolean };
}

export interface DurableObjectOutput {
  readonly type: "durable_object";
  readonly name: string;
  readonly className: string;
  readonly _ref: { className: string; scriptName?: string };
}

export interface CronOutput {
  readonly type: "cron";
  readonly name: string;
  readonly schedule: string;
}

export interface StaticSiteOutput {
  readonly type: "static_site";
  readonly name: string;
  readonly url: string;
}

export interface HyperdriveOutput {
  readonly type: "hyperdrive";
  readonly name: string;
  readonly _ref: { id: string; existing?: boolean; localConnectionString?: string };
}

export interface AnalyticsEngineOutput {
  readonly type: "analytics_engine";
  readonly name: string;
  readonly _ref: { dataset: string };
}

/** Resources that can be linked to a Worker */
export type LinkableResource =
  | WorkerOutput
  | BucketOutput
  | KVOutput
  | D1Output
  | QueueOutput
  | VectorizeOutput
  | DurableObjectOutput
  | HyperdriveOutput
  | AnalyticsEngineOutput;

// ============================================================================
// Binding Types (unified binding system)
// ============================================================================

/** Plain text environment variable */
export interface PlainTextBinding {
  type: "plain_text";
  value: string;
}

/** Secret text (encrypted at rest) */
export interface SecretTextBinding {
  type: "secret_text";
  value: string;
}

/** JSON value binding */
export interface JsonBinding {
  type: "json";
  value: unknown;
}

/** Service binding to another Worker */
export interface ServiceBinding {
  type: "service";
  service: string;
  entrypoint?: string;
}

/** All manual binding types */
export type ManualBinding = PlainTextBinding | SecretTextBinding | JsonBinding | ServiceBinding;

/** Binding value - can be a resource, manual binding, or simple string */
export type BindingValue = LinkableResource | ManualBinding | string;

// ============================================================================
// Build Options
// ============================================================================

export interface BuildOptions {
  /** Custom define replacements (compile-time constants) */
  define?: Record<string, string>;
  /** External packages to exclude from bundle */
  external?: string[];
  /** Enable sourcemaps @default true */
  sourcemap?: boolean;
  /** Enable minification @default true in production */
  minify?: boolean;
  /** Custom resolve conditions */
  conditions?: string[];
  /** Banner comment to prepend */
  banner?: string;
  /** Footer comment to append */
  footer?: string;
}

// ============================================================================
// Worker Options
// ============================================================================

/** Worker observability configuration */
export interface ObservabilityOptions {
  /** Enable observability @default true */
  enabled?: boolean;
  /** Head sampling rate (0-1) */
  headSamplingRate?: number;
  /** Log configuration */
  logs?: {
    enabled?: boolean;
    headSamplingRate?: number;
    invocationLogs?: boolean;
  };
}

/** Worker placement configuration */
export interface PlacementOptions {
  /** Placement mode */
  mode: "smart" | "off";
}

/** Worker configuration options */
export interface WorkerOptions {
  /** Entry point file path */
  entry: string;

  /**
   * Bindings - unified way to attach resources and environment variables
   * Keys become binding names (env.KEY in worker)
   * Values can be:
   * - LinkableResource: Bucket, KV, D1, Queue, etc.
   * - string: Plain text environment variable
   * - ManualBinding: { type: 'secret_text', value: '...' }, { type: 'ai' }, etc.
   *
   * @example
   * ```ts
   * bindings: {
   *   UPLOADS: bucket,           // R2 binding
   *   CACHE: cache,              // KV binding
   *   DB: database,              // D1 binding
   *   STAGE: ctx.stage,          // Plain text
   *   API_KEY: { type: 'secret_text', value: ctx.secrets.API_KEY },
   *   AI: { type: 'ai' },
   * }
   * ```
   */
  bindings?: Record<string, BindingValue>;

  /** Enable dedicated URL endpoint @default false */
  url?: boolean;

  /** Custom domain (must be on Cloudflare) */
  domain?: string;

  /** Static assets directory */
  assets?: {
    directory: string;
  };

  /** Build configuration */
  build?: BuildOptions;

  /** Compatibility date @default "2025-11-17" */
  compatibilityDate?: string;

  /** Compatibility flags @default ["nodejs_compat"] */
  compatibilityFlags?: string[];

  /** Observability configuration */
  observability?: ObservabilityOptions;

  /** Placement configuration @default { mode: 'smart' } */
  placement?: PlacementOptions;

  /** Enable logpush */
  logpush?: boolean;

  /** Transform underlying Pulumi resources */
  transform?: {
    worker?: (args: Record<string, unknown>) => void;
    version?: (args: Record<string, unknown>) => void;
  };
}

// ============================================================================
// Storage Resource Options
// ============================================================================

/** R2 location hints for bucket placement */
export type R2LocationHint =
  | "apac" // Asia Pacific
  | "eeur" // Eastern Europe
  | "enam" // Eastern North America
  | "weur" // Western Europe
  | "wnam"; // Western North America

/** R2 Bucket configuration */
export interface BucketOptions {
  /** Location hint for bucket placement */
  location?: R2LocationHint;

  /** Jurisdictional restriction (e.g., 'eu' for GDPR compliance) */
  jurisdiction?: "eu" | "fedramp";

  /** Default storage class for objects */
  storageClass?: "Standard" | "InfrequentAccess";

  /** Transform underlying Pulumi resources */
  transform?: {
    bucket?: (args: Record<string, unknown>) => void;
  };
}

/** KV Namespace configuration */
export interface KVOptions {
  /** Transform underlying Pulumi resources */
  transform?: {
    namespace?: (args: Record<string, unknown>) => void;
  };
}

/** D1 location hints */
export type D1LocationHint = "wnam" | "enam" | "weur" | "eeur" | "apac" | "oc";

/** D1 Database configuration */
export interface D1Options {
  /** Primary location hint */
  primaryLocation?: D1LocationHint;

  /** Enable read replication */
  readReplication?: boolean;

  /** Transform underlying Pulumi resources */
  transform?: {
    database?: (args: Record<string, unknown>) => void;
  };
}

/** Queue consumer settings */
export interface QueueConsumerSettings {
  /** Maximum batch size @default 10 */
  batchSize?: number;
  /** Maximum seconds to wait for batch @default 5 */
  batchTimeout?: number;
  /** Maximum retries @default 3 */
  maxRetries?: number;
  /** Maximum concurrent consumers */
  maxConcurrency?: number;
  /** Retry delay in seconds */
  retryDelay?: number;
}

/** Queue configuration */
export interface QueueOptions {
  /** Consumer worker */
  consumer?: {
    worker: WorkerOutput;
    settings?: QueueConsumerSettings;
  };

  /** Dead letter queue for failed messages */
  deadLetterQueue?: QueueOutput | string;

  /** Transform underlying Pulumi resources */
  transform?: {
    queue?: (args: Record<string, unknown>) => void;
    consumer?: (args: Record<string, unknown>) => void;
  };
}

/** Vectorize distance metrics */
export type VectorizeMetric = "cosine" | "euclidean" | "dot-product";

/** Vectorize Index configuration */
export interface VectorizeOptions {
  /** Vector dimensions (required) */
  dimensions: number;

  /** Distance metric @default "cosine" */
  metric?: VectorizeMetric;

  /** Transform underlying Pulumi resources */
  transform?: {
    index?: (args: Record<string, unknown>) => void;
  };
}

/** Durable Object configuration */
export interface DurableObjectOptions {
  /** Worker containing the Durable Object class */
  worker: WorkerOutput;

  /** Class name in the worker */
  className: string;

  /** Use SQLite storage (vs KV storage) @default true */
  sqlite?: boolean;
}

// ============================================================================
// Trigger Options
// ============================================================================

/** Cron trigger configuration */
export interface CronOptions {
  /** Worker to trigger */
  worker: WorkerOutput;

  /**
   * Cron schedule expression
   * @example "0 * * * *" (hourly)
   * @example "0 0 * * *" (daily at midnight)
   * @see https://developers.cloudflare.com/workers/configuration/cron-triggers/
   */
  schedule: string;
}

// ============================================================================
// Site Options
// ============================================================================

/** Static Site configuration */
export interface StaticSiteOptions {
  /** Directory containing static files */
  path: string;

  /** Custom domain */
  domain?: string;

  /** How to handle 404s @default "404-page" */
  notFoundHandling?: "none" | "single-page-application" | "404-page";

  /** How to handle HTML routing @default "auto-trailing-slash" */
  htmlHandling?: "auto-trailing-slash" | "force-trailing-slash" | "drop-trailing-slash" | "none";

  /** Whether to run worker before serving assets @default false */
  runWorkerFirst?: boolean;

  /** Build command to run before deploy */
  buildCommand?: string;

  /** Build output directory (relative to path) */
  buildOutput?: string;
}

// ============================================================================
// Hyperdrive Options
// ============================================================================

/** Hyperdrive configuration */
export interface HyperdriveOptions {
  /** PostgreSQL connection string (for production/Cloudflare) */
  connectionString: string;

  /** Local connection string for dev server (bypasses Hyperdrive, connects directly) */
  localConnectionString?: string;

  /** Caching configuration */
  caching?: {
    /** Disable caching entirely */
    disabled?: boolean;
    /** Max age in seconds */
    maxAge?: number;
    /** Stale while revalidate in seconds */
    staleWhileRevalidate?: number;
  };

  /** Transform underlying Pulumi resources */
  transform?: {
    config?: (args: Record<string, unknown>) => void;
  };
}

/** Analytics Engine configuration */
export interface AnalyticsEngineOptions {
  /** Transform underlying Pulumi resources */
  transform?: {
    dataset?: (args: Record<string, unknown>) => void;
  };
}

// ============================================================================
// Registry (internal, but exposed for CLI)
// ============================================================================

export interface ResourceRegistry {
  app: AppConfig & {
    stage: string;
  };
  workers: Array<{ name: string; options: WorkerOptions }>;
  buckets: Array<{ name: string; options?: BucketOptions }>;
  kvs: Array<{ name: string; options?: KVOptions }>;
  d1s: Array<{ name: string; options?: D1Options }>;
  queues: Array<{ name: string; options?: QueueOptions }>;
  vectorizes: Array<{ name: string; options: VectorizeOptions }>;
  durableObjects: Array<{ name: string; options: DurableObjectOptions }>;
  crons: Array<{ name: string; options: CronOptions }>;
  staticSites: Array<{ name: string; options: StaticSiteOptions }>;
  hyperdrives: Array<{ name: string; options: HyperdriveOptions }>;
  analyticsEngines: Array<{ name: string; options?: AnalyticsEngineOptions }>;
  outputs: Record<string, unknown>;
}
