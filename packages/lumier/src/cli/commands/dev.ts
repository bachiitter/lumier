/**
 * Development Server using Miniflare
 */

import { mkdir } from "node:fs/promises";
import * as path from "node:path";
import type { Readable } from "node:stream";
import * as chokidar from "chokidar";
import type { ResourceRegistry, WorkerOptions } from "lumier";
import { Log, LogLevel, Miniflare, type MiniflareOptions } from "miniflare";
import { build } from "../lib/build.js";
import { generateAll } from "../lib/codegen.js";
import { colors, DEFAULT_COMPATIBILITY_DATE, DEFAULT_COMPATIBILITY_FLAGS, DEFAULT_DEV_PORT } from "../lib/constants.js";
import { isLinkableResource, LumierError, log } from "../lib/utils.js";

interface MiniflareInstance {
  name: string;
  port: number;
  mf: Miniflare;
}

// ============================================================================
// Process Tracking
// ============================================================================

// Track instances globally for cleanup on error
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
// Binding Helpers
// ============================================================================

function buildMiniflareConfig(
  config: ResourceRegistry,
  worker: { name: string; options: WorkerOptions },
  buildDir: string,
  persistDir: string,
  port: number,
  stage: string
) {
  const { name, options: workerOpts } = worker;
  const scriptPath = path.join(buildDir, name, `${name}.js`);

  // Text bindings (plain strings and manual bindings)
  const textBindings: Record<string, string> = {};
  // Resource bindings
  const kvNamespaces: Record<string, string> = {};
  const r2Buckets: Record<string, string> = {};
  const d1Databases: Record<string, string> = {};
  const queueProducers: Record<string, string> = {};

  // Process all bindings
  for (const [key, value] of Object.entries(workerOpts.bindings ?? {})) {
    // Simple string = plain text
    if (typeof value === "string") {
      textBindings[key] = value;
      continue;
    }

    // Linkable resource
    if (isLinkableResource(value)) {
      switch (value.type) {
        case "kv":
          kvNamespaces[key] = `kv-${value.name}`;
          break;
        case "bucket":
          r2Buckets[key] = value.name;
          break;
        case "d1":
          d1Databases[key] = `d1-${value.name}`;
          break;
        case "queue":
          queueProducers[key] = value.name;
          break;
        // Other resource types handled in deploy only
      }
      continue;
    }

    // Manual binding types
    if ("type" in value) {
      switch (value.type) {
        case "plain_text":
        case "secret_text":
          textBindings[key] = value.value;
          break;
        case "json":
          textBindings[key] = JSON.stringify(value.value);
          break;
        // AI, browser, etc. not supported in local dev
      }
    }
  }

  const miniflareConfig: MiniflareOptions = {
    log: new Log(LogLevel.WARN),
    verbose: false,
    port,
    workers: [
      {
        name: `${config.app.name}-${stage}-${name}`,
        scriptPath,
        modules: true,
        compatibilityDate: workerOpts.compatibilityDate ?? DEFAULT_COMPATIBILITY_DATE,
        compatibilityFlags: workerOpts.compatibilityFlags ?? DEFAULT_COMPATIBILITY_FLAGS,
        bindings: textBindings,
        kvNamespaces,
        r2Buckets,
        d1Databases,
        queueProducers,
      },
    ],
    kvPersist: path.join(persistDir, "kv"),
    r2Persist: path.join(persistDir, "r2"),
    d1Persist: path.join(persistDir, "d1"),
    durableObjectsPersist: path.join(persistDir, "do"),
    handleRuntimeStdio: (_stdout: Readable, stderr: Readable) => {
      // Filter workerd internal errors (broken pipe on reload) and ready messages
      stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        const shouldSkip = text.includes("workerd/") || text.includes("Broken pipe");
        if (!shouldSkip) {
          process.stderr.write(chunk);
        }
      });
    },
  };

  return miniflareConfig;
}

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
  await mkdir(persistDir, { recursive: true });

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
  generateAll(config, rootDir, lumierDir);

  const workers = options.worker ? config.workers.filter((w) => w.name === options.worker) : config.workers;
  const basePort = options.port ?? DEFAULT_DEV_PORT;

  if (workers.length === 0) {
    throw new LumierError("No workers found", "NO_WORKERS");
  }

  const instances: MiniflareInstance[] = [];
  let currentPort = basePort;

  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i]!;
    const port = currentPort++;
    const miniflareConfig = buildMiniflareConfig(config, worker, buildDir, persistDir, port, stage);

    const mf = new Miniflare(miniflareConfig);
    await mf.ready;
    instances.push({ name: worker.name, port, mf });
  }

  // Store globally for shutdown handler
  globalInstances = instances;

  console.log("");
  for (const instance of instances) {
    log(`+ ${instance.name}`, `http://localhost:${instance.port}`);
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

      for (let i = 0; i < globalInstances.length; i++) {
        const instance = globalInstances[i]!;
        const worker = config.workers.find((w) => w.name === instance.name);
        if (!worker) continue;

        const mfConfig = buildMiniflareConfig(config, worker, buildDir, persistDir, instance.port, stage);
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
      // Ignore node_modules, .lumier, env files, declaration files, and config
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
      const result = generateAll(config, rootDir, lumierDir, { force: true });

      if (result.generated.length > 0) {
        log("+ types", result.generated.join(", "));
      }

      await build(config, { stage, rootDir, lumierDir, silent: true });

      const filteredWorkers = options.worker ? config.workers.filter((w) => w.name === options.worker) : config.workers;

      const currentNames = new Set(globalInstances.map((i) => i.name));
      const newNames = new Set(filteredWorkers.map((w) => w.name));

      // Check if workers were added or removed
      const addedWorkers = filteredWorkers.filter((w) => !currentNames.has(w.name));
      const removedWorkers = globalInstances.filter((i) => !newNames.has(i.name));

      if (addedWorkers.length > 0 || removedWorkers.length > 0) {
        // Dispose all existing instances
        for (const instance of globalInstances) {
          await instance.mf.dispose();
        }
        globalInstances = [];

        // Visual separator for restart
        console.log(`\n${colors.dim}${"─".repeat(50)}${colors.reset}\n`);
        log("~ restart", "Workers changed, restarting...");

        // Start fresh instances for all workers
        let nextPort = basePort;
        for (const worker of filteredWorkers) {
          const port = nextPort++;
          const mfConfig = buildMiniflareConfig(config, worker, buildDir, persistDir, port, stage);
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
        // Update existing workers only
        for (let i = 0; i < globalInstances.length; i++) {
          const instance = globalInstances[i]!;
          const worker = filteredWorkers.find((w) => w.name === instance.name);
          if (!worker) continue;

          const mfConfig = buildMiniflareConfig(config, worker, buildDir, persistDir, instance.port, stage);
          await instance.mf.setOptions(mfConfig);
        }

        log("+ reload", "Workers updated");
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

  // biome-ignore lint/suspicious/noEmptyBlockStatements: shut up!
  await new Promise(() => {});
}
