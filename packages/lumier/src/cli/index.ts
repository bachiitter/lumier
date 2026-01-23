#!/usr/bin/env node
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { type ConfigOptions, clearRegistry, getRegistry, type ResourceRegistry, type RuntimeContext } from "../sdk/index.js";
import { init } from "./commands/init.js";
import {
  CONFIG_FILENAME,
  colors,
  DEFAULT_DEV_PORT,
  DEFAULT_STAGE,
  PACKAGE_JSON_FILENAME,
  STATE_DIR_NAME,
} from "./lib/constants.js";
import { isProduction, LumierError, parsePort, validateStageName } from "./lib/utils.js";

const ROOT_DIR = process.cwd();
const LUMIER_DIR = path.join(ROOT_DIR, STATE_DIR_NAME);

// Verbose logging - enabled with --verbose or DEBUG=1
let verbose = false;

export function setVerboseLogging(enabled: boolean): void {
  verbose = enabled;
}

export function verboseLog(...args: unknown[]): void {
  if (verbose) {
    console.log(`${colors.dim}[lumier]${colors.reset}`, ...args);
  }
}

interface ParseArgsResult {
  command?: string;
  flags: Record<string, string | boolean>;
  positional: Array<string>;
}

function parseArgs(args: Array<string>) {
  const result: ParseArgsResult = {
    flags: {},
    positional: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg?.startsWith("--")) {
      const equalSignIndex = arg.indexOf("=");

      if (equalSignIndex !== -1) {
        const flagName = arg.slice(2, equalSignIndex);
        const flagValue = arg.slice(equalSignIndex + 1);
        result.flags[flagName] = flagValue;
      } else {
        const flagName = arg.slice(2);
        const nextArg = args[i + 1];

        if (nextArg && !nextArg.startsWith("-")) {
          result.flags[flagName] = nextArg;
          i++;
        } else {
          result.flags[flagName] = true;
        }
      }
    } else if (!result.command) {
      result.command = arg;
    } else {
      result.positional.push(arg!);
    }
  }

  return result;
}

async function loadConfig(stage: string): Promise<ResourceRegistry> {
  clearRegistry();

  const configPath = path.join(ROOT_DIR, CONFIG_FILENAME);
  try {
    await fs.access(configPath);
  } catch {
    throw new LumierError("lumier.config.ts not found", "CONFIG_NOT_FOUND", "Run: lumier init");
  }
  const configModule = await import(configPath + `?t=${Date.now()}`);

  if (!configModule.default || typeof configModule.default !== "object") {
    throw new LumierError("Invalid config: expected default export", "INVALID_CONFIG");
  }

  const config = configModule.default as ConfigOptions & { _lumier?: boolean };
  if (!config._lumier) {
    throw new LumierError("Config must use $config() wrapper", "INVALID_CONFIG");
  }
  const appConfig = config.app({ stage });

  const registry = getRegistry();
  registry.app = { ...appConfig, stage };

  const ctx = {
    stage,
    app: registry.app,
    isDev: !isProduction(stage),
    isProduction: isProduction(stage),
  } satisfies RuntimeContext;

  const outputs = config.run(ctx) ?? {};

  registry.outputs = outputs;

  verboseLog(
    "Registry:",
    registry.workers.length,
    "workers,",
    registry.kvs.length,
    "KVs,",
    registry.d1s.length,
    "D1s,",
    registry.buckets.length,
    "buckets"
  );

  return registry;
}

function printHelp(): void {
  console.log(`
${colors.bold}Commands:${colors.reset}
  init              Initialize a new project
  dev               Start dev server with hot reload using Miniflare
  deploy            Build and deploy to Cloudflare
  deploy --preview  Preview changes without deploying
  destroy           Destroy resources
  secret            Manage encrypted secrets
  shell             Get environment with resource IDs
  version           Show version
`);
}

function checkStageProtection(app: { protect?: string[] }, stage: string, action: string): boolean {
  if (!app.protect?.includes(stage)) return true;

  console.error(
    `\n${colors.red}Error:${colors.reset} Cannot ${action} the "${stage}" stage because it is protected.\n`
  );
  console.error(`Remove "${stage}" from ${colors.dim}protect${colors.reset} array in your config to allow this action.\n`);
  return false;
}

async function main(args: Array<string>): Promise<void> {
  const { command, flags } = parseArgs(args);

  console.log(`${colors.bold}${colors.cyan}Lumier${colors.reset} - Infrastructure as Code for Cloudflare`);

  verbose = Boolean(flags.verbose) || process.env.DEBUG === "1";

  const stage = typeof flags.stage === "string" ? flags.stage : DEFAULT_STAGE;
  validateStageName(stage);

  try {
    switch (command) {
      case "-v":
      case "--version":
      case "version": {
        const PACKAGE_JSON_PATH = path.join(ROOT_DIR, PACKAGE_JSON_FILENAME);
        let packageVersion = "unknown";
        try {
          const content = await fs.readFile(PACKAGE_JSON_PATH, "utf-8");
          packageVersion = JSON.parse(content)?.version ?? "unknown";
        } catch {
          // ignore
        }

        console.log(`lumier v${packageVersion}`);
        break;
      }
      case "init": {
        await init();
        break;
      }
      case "dev": {
        const port = typeof flags.port === "string" ? parsePort(flags.port, DEFAULT_DEV_PORT) : DEFAULT_DEV_PORT;

        const { dev } = await import("./commands/dev.js");

        await dev({
          stage,
          port,
          rootDir: ROOT_DIR,
          lumierDir: LUMIER_DIR,
          loadConfig: () => loadConfig(stage),
        });

        break;
      }
      case "deploy": {
        const config = await loadConfig(stage);
        if (!checkStageProtection(config.app, stage, "deploy")) process.exit(1);

        // Generate types before build
        const { generateTypes } = await import("./lib/codegen.js");
        await generateTypes(config, ROOT_DIR);

        const { build } = await import("./lib/build.js");
        await build(config, { stage, rootDir: ROOT_DIR, lumierDir: LUMIER_DIR });

        break;
      }
      case "help":
      case undefined: {
        printHelp();
        break;
      }
      default: {
        console.error(`Unknown command: ${command}`);
        console.error('Run "lumier help" for available commands');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`\n${colors.red}Error:${colors.reset} ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

main(process.argv.slice(2));
