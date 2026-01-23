import { mkdir } from "node:fs/promises";
import path from "node:path";
import * as readline from "node:readline";
import * as Bun from "bun";
import {
  CONFIG_FILENAME,
  colors,
  GITIGNORE_FILENAME,
  PACKAGE_JSON_FILENAME,
  STATE_DIR_NAME,
} from "../lib/constants.js";
import { CONFIG_TEMPLATE, WORKER_TEMPLATE } from "../lib/template.js";
import { ensureFileContains } from "../lib/utils.js";

const ROOT_DIR = process.cwd();
const LUMIER_DIR = path.join(ROOT_DIR, STATE_DIR_NAME);
const GITIGNORE_PATH = path.join(ROOT_DIR, GITIGNORE_FILENAME);
const SRC_PATH = path.join(ROOT_DIR, "src");
const WORKER_PATH = path.join(SRC_PATH, "index.ts");
const CONFIG_PATH = path.join(ROOT_DIR, CONFIG_FILENAME);
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, PACKAGE_JSON_FILENAME);

function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/n) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

export async function init(): Promise<void> {
  const [configExists, lumierDirExists, gitignoreContent, packageJson, workerExists] = await Promise.all([
    Bun.file(CONFIG_PATH).exists(),
    Bun.file(LUMIER_DIR).exists(),
    Bun.file(GITIGNORE_PATH)
      .exists()
      .then((exists) => (exists ? Bun.file(GITIGNORE_PATH).text() : "")),
    Bun.file(PACKAGE_JSON_PATH)
      .json()
      .catch(() => ({})),
    Bun.file(WORKER_PATH).exists(),
  ]);

  const appName = packageJson?.name || "my-app";
  const gitignoreNeedsUpdate = !gitignoreContent.includes(STATE_DIR_NAME);
  const gitignoreExists = gitignoreContent.length > 0;

  // Check if already initialized
  if (configExists && lumierDirExists && !gitignoreNeedsUpdate && workerExists) {
    console.log(`${colors.dim}Project already initialized. Nothing to do.${colors.reset}`);
    return;
  }

  // Show what will happen
  console.log(`\n${colors.bold}What this does:${colors.reset}`);

  if (configExists) {
    console.log(
      `  ${colors.dim}○${colors.reset} ${CONFIG_FILENAME} ${colors.dim}(already exists, skip)${colors.reset}`
    );
  } else {
    console.log(
      `  ${colors.green}+${colors.reset} Create ${colors.cyan}${CONFIG_FILENAME}${colors.reset} - infrastructure config`
    );
  }

  if (lumierDirExists) {
    console.log(
      `  ${colors.dim}○${colors.reset} ${STATE_DIR_NAME}/ ${colors.dim}(already exists, skip)${colors.reset}`
    );
  } else {
    console.log(
      `  ${colors.green}+${colors.reset} Create ${colors.cyan}${STATE_DIR_NAME}/${colors.reset} directory - local state & secrets`
    );
  }

  if (!gitignoreNeedsUpdate) {
    console.log(
      `  ${colors.dim}○${colors.reset} ${GITIGNORE_FILENAME} ${colors.dim}(already configured, skip)${colors.reset}`
    );
  } else if (gitignoreExists) {
    console.log(
      `  ${colors.green}+${colors.reset} Update ${colors.cyan}${GITIGNORE_FILENAME}${colors.reset} - exclude ${STATE_DIR_NAME}/ from git`
    );
  } else {
    console.log(
      `  ${colors.green}+${colors.reset} Create ${colors.cyan}${GITIGNORE_FILENAME}${colors.reset} - exclude ${STATE_DIR_NAME}/ from git`
    );
  }

  if (workerExists) {
    console.log(`  ${colors.dim}○${colors.reset} src/index.ts ${colors.dim}(already exists, skip)${colors.reset}`);
  } else {
    console.log(
      `  ${colors.green}+${colors.reset} Create ${colors.cyan}src/index.ts${colors.reset} - worker entry point`
    );
  }

  console.log();

  const shouldProceed = await confirm("Continue?");

  if (!shouldProceed) {
    console.log(`${colors.dim}Aborted.${colors.reset}`);
    return;
  }

  // Run tasks
  if (!configExists) {
    await Bun.write(CONFIG_PATH, CONFIG_TEMPLATE(appName));
    console.log(`  ${colors.green}+${colors.reset} Created ${CONFIG_FILENAME}`);
  }

  if (!lumierDirExists) {
    await mkdir(LUMIER_DIR, { recursive: true });
    console.log(`  ${colors.green}+${colors.reset} Created ${STATE_DIR_NAME}/`);
  }

  if (gitignoreNeedsUpdate) {
    await ensureFileContains(
      GITIGNORE_PATH,
      `# Lumier local state\n${STATE_DIR_NAME}/\n`,
      `# Lumier local state\n${STATE_DIR_NAME}/\n`
    );
    console.log(`  ${colors.green}+${colors.reset} ${gitignoreExists ? "Updated" : "Created"} ${GITIGNORE_FILENAME}`);
  }

  if (!workerExists) {
    await mkdir(SRC_PATH, { recursive: true });
    await Bun.write(WORKER_PATH, WORKER_TEMPLATE);
    console.log(`  ${colors.green}+${colors.reset} Created src/index.ts`);
  }

  // Next steps
  console.log(`
${colors.bold}Done! Next steps:${colors.reset}
  bun run lumier dev      Start dev server with hot reload
  bun run lumier deploy   Deploy to Cloudflare

  Edit ${CONFIG_FILENAME} to add KV, D1, R2, and other resources.
`);
}
