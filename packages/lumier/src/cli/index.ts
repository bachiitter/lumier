#!/usr/bin/env bun
import * as Bun from "bun";
import { type ConfigOptions, clearRegistry, getRegistry, type ResourceRegistry, type RuntimeContext } from "lumier";
import path from "path";
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
  if (!Bun.file(configPath).exists()) {
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
  dev --live        Deploy and watch for changes (real Cloudflare)
  deploy            Build and deploy to Cloudflare
  deploy --preview  Preview changes without deploying
  destroy           Destroy resources
  secret            Manage encrypted secrets
  shell             Get environment with resource IDs
  version           Show version
`);
}

async function main(args: Array<string>): Promise<void> {
  const { command, flags } = parseArgs(args);

  console.log(`${colors.bold}${colors.cyan}Lumier${colors.reset} - Infrastructure as Code for Cloudflare`);

  verbose = Boolean(flags.verbose) || Bun.env.DEBUG === "1";

  const stage = typeof flags.stage === "string" ? flags.stage : DEFAULT_STAGE;
  validateStageName(stage);

  try {
    switch (command) {
      case "-v":
      case "--version":
      case "version": {
        const PACKAGE_JSON_PATH = path.join(ROOT_DIR, PACKAGE_JSON_FILENAME);
        const packageJson = await Bun.file(PACKAGE_JSON_PATH)
          .json()
          .catch(() => ({}));

        const packageVersion = packageJson?.version;

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
