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
  stage: string,
  isFirst: boolean
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
  };

  // Only attach stdio for the first worker to avoid duplicate logs
  if (isFirst) {
    miniflareConfig.handleRuntimeStdio = (stdout: Readable, stderr: Readable) => {
      stdout.pipe(process.stdout);
      stderr.pipe(process.stderr);
    };
  }

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
  build(config, { stage, rootDir, lumierDir });
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
    const isFirst = i === 0;
    const miniflareConfig = buildMiniflareConfig(config, worker, buildDir, persistDir, port, stage, isFirst);

    const mf = new Miniflare(miniflareConfig);
    await mf.ready;
    log(`+ ${worker.name}`, `http://localhost:${port}`);
    instances.push({ name: worker.name, port, mf });
  }

  // Store globally for shutdown handler
  globalInstances = instances;

  console.log(`\n${colors.dim}Watching for changes... (Ctrl+C to stop)${colors.reset}\n`);

  let isRebuilding = false;

  async function handleRebuild(filename: string): Promise<void> {
    if (isRebuilding) return;

    isRebuilding = true;
    log("~ rebuild", filename);

    config = await loadConfig();
    await build(config, { stage, rootDir, lumierDir });

    for (let i = 0; i < globalInstances.length; i++) {
      const instance = globalInstances[i]!;
      const worker = config.workers.find((w) => w.name === instance.name);
      if (!worker) continue;

      const mfConfig = buildMiniflareConfig(config, worker, buildDir, persistDir, instance.port, stage, i === 0);
      await instance.mf.setOptions(mfConfig);
    }

    log("+ reload", "Workers updated");
    isRebuilding = false;
  }

  globalWatcher = chokidar.watch(rootDir, {
    ignored: ["**/node_modules/**", "**/.lumier/**", "**/.env*", "**/*-env.d.ts", "**/*.d.ts", "**/lumier.config.*"],
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

    config = await loadConfig();
    const result = generateAll(config, rootDir, lumierDir, { force: true });

    if (result.generated.length > 0) {
      log("+ types", result.generated.join(", "));
    }

    await build(config, { stage, rootDir, lumierDir });

    for (let i = 0; i < globalInstances.length; i++) {
      const instance = globalInstances[i]!;
      const worker = config.workers.find((w) => w.name === instance.name);
      if (!worker) continue;

      const mfConfig = buildMiniflareConfig(config, worker, buildDir, persistDir, instance.port, stage, i === 0);
      await instance.mf.setOptions(mfConfig);
    }

    log("+ reload", "Workers updated");
    isRebuilding = false;
  });

  // Keep the process alive

  // biome-ignore lint/suspicious/noEmptyBlockStatements: shut up!
  await new Promise(() => {});
}
