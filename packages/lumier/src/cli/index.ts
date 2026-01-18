#!/usr/bin/env bun
import { intro, note, outro } from "@clack/prompts";
// biome-ignore lint/performance/noNamespaceImport: doesn't matter
import * as Bun from "bun";
import path from "path";
import { parseArgs } from "util";
import { init } from "./commands/init.js";
import { colors, PACKAGE_JSON_FILENAME } from "./lib/constants.js";

const ROOT_DIR = process.cwd();

async function main(): Promise<void> {
  const { positionals } = parseArgs({
    args: Bun.argv.slice(2),
    strict: true,
    allowPositionals: true,
    options: {},
  });

  const command = positionals[0];

  intro(` ${colors.bold}${colors.cyan}Lumier${colors.reset} - Infrastructure as Code for Cloudflare`);

  try {
    switch (command) {
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
        break;
      }
      default: {
        note(
          `init              Initialize a new project
dev               Start dev server with hot reload
deploy            Build and deploy to Cloudflare
deploy --preview  Preview changes without deploying
destroy           Destroy resources
secret            Manage encrypted secrets`,
          `${colors.bold}Commands:`
        );
      }
    }
  } catch (error) {
    outro(`${colors.red}Error:${colors.reset} ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
