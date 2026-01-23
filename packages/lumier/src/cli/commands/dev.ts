/**
 * Development Server using Miniflare
 *
 * Uses multiple Miniflare instances (one per worker) with cross-worker
 * communication via function-based service bindings.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Readable } from "node:stream";
import * as chokidar from "chokidar";
import {
  Log,
  LogLevel,
  Miniflare,
  type MiniflareOptions,
  type WorkerOptions as MiniflareWorkerOptions,
} from "miniflare";
import type { ResourceRegistry, WorkerOptions } from "../../sdk/index.js";
import { build } from "../lib/build.js";
import { generateAll } from "../lib/codegen.js";
import { colors, DEFAULT_COMPATIBILITY_DATE, DEFAULT_COMPATIBILITY_FLAGS, DEFAULT_DEV_PORT } from "../lib/constants.js";
import { isLinkableResource, LumierError, log } from "../lib/utils.js";

// ============================================================================
// Types
// ============================================================================

interface MiniflareInstance {
  name: string;
  port: number;
  mf: Miniflare;
}

// ============================================================================
// Process Tracking
// ============================================================================

let globalInstances: MiniflareInstance[] = [];
let globalWatcher: chokidar.FSWatcher | null = null;
let globalConfigWatcher: chokidar.FSWatcher | null = null;
let isShuttingDown = false;

// ============================================================================
// Shutdown Handler
// ============================================================================

async function shutdown(code: number = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${colors.yellow}Shutting down...${colors.reset}`);

  if (globalWatcher) {
    globalWatcher.close();
    globalWatcher = null;
  }

  if (globalConfigWatcher) {
    globalConfigWatcher.close();
    globalConfigWatcher = null;
  }

  for (const instance of globalInstances) {
    await instance.mf.dispose();
  }
  globalInstances = [];

  process.exit(code);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("uncaughtException", (err) => {
  if (err.message?.includes("Address already in use")) {
    console.error(`\n${colors.red}Error: Port is already in use${colors.reset}`);
    console.error(`${colors.dim}Try a different port with: lumier dev --port=8788${colors.reset}\n`);
  } else {
    console.error(`\n${colors.red}Error: ${err.message}${colors.reset}`);
  }
  shutdown(1);
});

// ============================================================================
// Binding Processors
// ============================================================================

interface BindingCollections {
  textBindings: Record<string, string>;
  kvNamespaces: Record<string, string>;
  r2Buckets: Record<string, string>;
  d1Databases: Record<string, string>;
  queueProducers: Record<string, string>;
  durableObjects: Record<string, { className: string; scriptName?: string; useSQLite?: boolean }>;
  serviceBindingTargets: Record<string, string>;
  hyperdrives: Record<string, { connectionString: string }>;
}

function createEmptyCollections(): BindingCollections {
  return {
    textBindings: {},
    kvNamespaces: {},
    r2Buckets: {},
    d1Databases: {},
    queueProducers: {},
    durableObjects: {},
    serviceBindingTargets: {},
    hyperdrives: {},
  };
}

function processLinkableBinding(
  key: string,
  value: { type: string; name: string; className?: string; _ref?: Record<string, unknown> },
  collections: BindingCollections
): void {
  const { type, name, className, _ref } = value;

  if (type === "kv") {
    collections.kvNamespaces[key] = `kv-${name}`;
  } else if (type === "bucket") {
    collections.r2Buckets[key] = name;
  } else if (type === "d1") {
    collections.d1Databases[key] = `d1-${name}`;
  } else if (type === "queue") {
    collections.queueProducers[key] = name;
  } else if (type === "durable_object") {
    collections.durableObjects[key] = {
      className: className ?? "",
      useSQLite: true,
    };
  } else if (type === "worker") {
    const scriptName = (_ref?.scriptName as string) ?? "";
    collections.serviceBindingTargets[key] = scriptName;
  } else if (type === "hyperdrive") {
    const connString = _ref?.localConnectionString as string | undefined;
    if (connString) {
      collections.hyperdrives[key] = { connectionString: connString };
    } else {
      console.warn(
        `${colors.yellow}Warning: Hyperdrive binding "${key}" missing localConnectionString - binding skipped in dev${colors.reset}`
      );
    }
  }
}

function processManualBinding(
  key: string,
  value: { type: string; value?: unknown; service?: string; entrypoint?: string },
  collections: BindingCollections
): void {
  const { type } = value;

  if (type === "plain_text" || type === "secret_text") {
    collections.textBindings[key] = value.value as string;
  } else if (type === "json") {
    collections.textBindings[key] = JSON.stringify(value.value);
  } else if (type === "service" && value.service) {
    collections.serviceBindingTargets[key] = value.service;
  }
}

function processBindings(bindings: Record<string, unknown> | undefined): BindingCollections {
  const collections = createEmptyCollections();

  for (const [key, value] of Object.entries(bindings ?? {})) {
    if (typeof value === "string") {
      collections.textBindings[key] = value;
    } else if (isLinkableResource(value)) {
      processLinkableBinding(key, value as never, collections);
    } else if (typeof value === "object" && value !== null && "type" in value) {
      processManualBinding(key, value as never, collections);
    }
  }

  return collections;
}

// ============================================================================
// Config Builders
// ============================================================================

function buildCronsByWorker(config: ResourceRegistry): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const cronEntry of config.crons) {
    const workerName = cronEntry.options.worker._ref.scriptName;
    const crons = map.get(workerName) ?? [];
    crons.push(cronEntry.options.schedule);
    map.set(workerName, crons);
  }
  return map;
}

function buildQueueConsumers(
  config: ResourceRegistry
): Record<string, { maxBatchSize?: number; maxBatchTimeout?: number; maxRetries?: number }> {
  const consumers: Record<string, { maxBatchSize?: number; maxBatchTimeout?: number; maxRetries?: number }> = {};
  for (const queueEntry of config.queues) {
    const consumer = queueEntry.options?.consumer;
    if (consumer) {
      consumers[queueEntry.name] = {
        maxBatchSize: consumer.settings?.batchSize,
        maxBatchTimeout: consumer.settings?.batchTimeout,
        maxRetries: consumer.settings?.maxRetries,
      };
    }
  }
  return consumers;
}

function buildMiniflareConfig(
  worker: { name: string; options: WorkerOptions },
  config: ResourceRegistry,
  buildDir: string,
  persistDir: string,
  port: number,
  stage: string,
  cronsByWorker: Map<string, string[]>,
  workerPortMap: Map<string, number>
): MiniflareOptions {
  const { name, options: workerOpts } = worker;
  const fullName = `${config.app.name}-${stage}-${name}`;
  const scriptPath = path.join(buildDir, name, `${name}.js`);
  const collections = processBindings(workerOpts.bindings as Record<string, unknown>);

  // Build service bindings as fetch functions to other worker ports
  const serviceBindings: Record<string, (request: Request) => Promise<Response>> = {};
  for (const [bindingName, targetWorkerName] of Object.entries(collections.serviceBindingTargets)) {
    const targetPort = workerPortMap.get(targetWorkerName);
    if (targetPort) {
      serviceBindings[bindingName] = (request: Request) => {
        const url = new URL(request.url);
        url.host = `localhost:${targetPort}`;
        return fetch(new Request(url.toString(), request));
      };
    }
  }

  const workerConfig: MiniflareWorkerOptions = {
    name: fullName,
    scriptPath,
    modules: true,
    compatibilityDate: workerOpts.compatibilityDate ?? DEFAULT_COMPATIBILITY_DATE,
    compatibilityFlags: workerOpts.compatibilityFlags ?? DEFAULT_COMPATIBILITY_FLAGS,
    bindings: collections.textBindings,
    kvNamespaces: collections.kvNamespaces,
    r2Buckets: collections.r2Buckets,
    d1Databases: collections.d1Databases,
    queueProducers: collections.queueProducers,
    durableObjects: Object.keys(collections.durableObjects).length > 0 ? collections.durableObjects : undefined,
    serviceBindings: Object.keys(serviceBindings).length > 0 ? serviceBindings : undefined,
    hyperdrives: Object.keys(collections.hyperdrives).length > 0 ? collections.hyperdrives : undefined,
  };

  // Add crons if defined for this worker
  const crons = cronsByWorker.get(name);
  if (crons && crons.length > 0) {
    (workerConfig as Record<string, unknown>).crons = crons;
  }

  // Add unsafeEvalBinding for nodejs_compat
  const flags = workerOpts.compatibilityFlags ?? [];
  if (flags.includes("nodejs_compat") || flags.includes("nodejs_compat_v2")) {
    (workerConfig as Record<string, unknown>).unsafeEvalBinding = "__UNSAFE_EVAL";
  }

  const queueConsumers = buildQueueConsumers(config);

  return {
    log: new Log(LogLevel.WARN),
    verbose: false,
    port,
    workers: [workerConfig],
    kvPersist: path.join(persistDir, "kv"),
    r2Persist: path.join(persistDir, "r2"),
    d1Persist: path.join(persistDir, "d1"),
    durableObjectsPersist: path.join(persistDir, "do"),
    queueConsumers: Object.keys(queueConsumers).length > 0 ? queueConsumers : undefined,
    handleRuntimeStdio: (_stdout: Readable, stderr: Readable) => {
      stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        const shouldSkip = text.includes("workerd/") || text.includes("Broken pipe");
        if (!shouldSkip) {
          process.stderr.write(chunk);
        }
      });
    },
  };
}

// ============================================================================
// Dev Server
// ============================================================================

export interface DevOptions {
  stage: string;
  worker?: string;
  port?: number;
  rootDir: string;
  lumierDir: string;
  loadConfig: () => Promise<ResourceRegistry>;
}

export async function dev(options: DevOptions): Promise<void> {
  const { stage, rootDir, lumierDir, loadConfig } = options;

  let config = await loadConfig();

  const persistDir = path.join(lumierDir, "persist");
  const buildDir = path.join(lumierDir, "build");
  await fs.mkdir(persistDir, { recursive: true });

  // Build and generate
  try {
    await build(config, { stage, rootDir, lumierDir, silent: true });
  } catch (err) {
    if (err instanceof LumierError) {
      log("x error", err.message);
    } else {
      throw err;
    }
  }
  await generateAll(config, rootDir, lumierDir);

  const workers = options.worker ? config.workers.filter((w) => w.name === options.worker) : config.workers;
  const basePort = options.port ?? DEFAULT_DEV_PORT;

  if (workers.length === 0) {
    throw new LumierError("No workers found", "NO_WORKERS");
  }

  // Build port map first (needed for service bindings)
  const workerPortMap = new Map<string, number>();
  let currentPort = basePort;
  for (const worker of workers) {
    workerPortMap.set(worker.name, currentPort++);
  }

  const cronsByWorker = buildCronsByWorker(config);

  // Create separate Miniflare instance per worker
  const instances: MiniflareInstance[] = [];
  for (const worker of workers) {
    const port = workerPortMap.get(worker.name)!;
    const miniflareConfig = buildMiniflareConfig(
      worker,
      config,
      buildDir,
      persistDir,
      port,
      stage,
      cronsByWorker,
      workerPortMap
    );

    const mf = new Miniflare(miniflareConfig);
    await mf.ready;
    instances.push({ name: worker.name, port, mf });
  }

  globalInstances = instances;

  console.log("");
  for (const instance of instances) {
    log(`+ ${instance.name}`, `http://localhost:${instance.port}`);
  }

  // Show cron info if any
  if (config.crons.length > 0) {
    console.log("");
    for (const instance of instances) {
      const workerCrons = cronsByWorker.get(instance.name);
      if (workerCrons && workerCrons.length > 0) {
        log("~ cron", `${instance.name}: curl "http://localhost:${instance.port}/cdn-cgi/mf/scheduled"`);
      }
    }
  }

  console.log(`\n${colors.dim}Watching for changes... (Ctrl+C to stop)${colors.reset}\n`);

  let isRebuilding = false;

  async function handleRebuild(filename: string): Promise<void> {
    if (isRebuilding) return;

    isRebuilding = true;
    log("~ rebuild", filename);

    try {
      config = await loadConfig();
      await build(config, { stage, rootDir, lumierDir, silent: true });

      const updatedCrons = buildCronsByWorker(config);

      for (const instance of globalInstances) {
        const worker = config.workers.find((w) => w.name === instance.name);
        if (!worker) continue;

        const mfConfig = buildMiniflareConfig(
          worker,
          config,
          buildDir,
          persistDir,
          instance.port,
          stage,
          updatedCrons,
          workerPortMap
        );
        await instance.mf.setOptions(mfConfig);
      }

      log("+ reload", "Workers updated");
    } catch (err) {
      if (err instanceof LumierError) {
        log("x error", err.message);
      } else {
        log("x error", String(err));
      }
    }
    isRebuilding = false;
  }

  globalWatcher = chokidar.watch(rootDir, {
    ignored: (filePath: string) => {
      if (filePath.includes("node_modules")) return true;
      if (filePath.includes(".lumier")) return true;
      if (filePath.includes(".env")) return true;
      if (filePath.endsWith(".d.ts")) return true;
      if (filePath.includes("lumier.config.")) return true;
      return false;
    },
    followSymlinks: false,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  globalWatcher?.on("change", (filepath) => {
    if (filepath.endsWith(".ts") || filepath.endsWith(".tsx")) {
      handleRebuild(path.relative(rootDir, filepath));
    }
  });

  // Watch config file separately for type regeneration
  globalConfigWatcher = chokidar.watch(path.join(rootDir, "lumier.config.ts"), {
    ignoreInitial: true,
    usePolling: true,
    interval: 300,
  });

  globalConfigWatcher?.on("change", async () => {
    if (isRebuilding) return;

    isRebuilding = true;
    log("~ config", "lumier.config changed");

    try {
      config = await loadConfig();
      const result = await generateAll(config, rootDir, lumierDir, { force: true });

      if (result.generated.length > 0) {
        log("+ types", result.generated.join(", "));
      }

      await build(config, { stage, rootDir, lumierDir, silent: true });

      const filteredWorkers = options.worker ? config.workers.filter((w) => w.name === options.worker) : config.workers;
      const updatedCrons = buildCronsByWorker(config);

      // Check if workers changed
      const currentNames = new Set(globalInstances.map((i) => i.name));
      const newNames = new Set(filteredWorkers.map((w) => w.name));
      const addedWorkers = filteredWorkers.filter((w) => !currentNames.has(w.name));
      const removedWorkers = globalInstances.filter((i) => !newNames.has(i.name));

      if (addedWorkers.length > 0 || removedWorkers.length > 0) {
        // Dispose all and restart
        for (const instance of globalInstances) {
          await instance.mf.dispose();
        }
        globalInstances = [];

        console.log(`\n${colors.dim}${"─".repeat(50)}${colors.reset}\n`);
        log("~ restart", "Workers changed, restarting...");

        // Rebuild port map
        const newPortMap = new Map<string, number>();
        let nextPort = basePort;
        for (const worker of filteredWorkers) {
          newPortMap.set(worker.name, nextPort++);
        }

        // Start new instances
        for (const worker of filteredWorkers) {
          const port = newPortMap.get(worker.name)!;
          const mfConfig = buildMiniflareConfig(
            worker,
            config,
            buildDir,
            persistDir,
            port,
            stage,
            updatedCrons,
            newPortMap
          );
          const mf = new Miniflare(mfConfig);
          await mf.ready;
          globalInstances.push({ name: worker.name, port, mf });
        }

        console.log("");
        for (const instance of globalInstances) {
          log(`+ ${instance.name}`, `http://localhost:${instance.port}`);
        }
        console.log("");
      } else {
        // Update existing workers
        for (const instance of globalInstances) {
          const worker = filteredWorkers.find((w) => w.name === instance.name);
          if (!worker) continue;

          const mfConfig = buildMiniflareConfig(
            worker,
            config,
            buildDir,
            persistDir,
            instance.port,
            stage,
            updatedCrons,
            workerPortMap
          );
          await instance.mf.setOptions(mfConfig);
        }

        log("+ reload", "Config updated");
      }
    } catch (err) {
      if (err instanceof LumierError) {
        log("x error", err.message);
      } else {
        log("x error", String(err));
      }
    }
    isRebuilding = false;
  });

  // Keep the process alive
  // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional
  await new Promise(() => {});
}
