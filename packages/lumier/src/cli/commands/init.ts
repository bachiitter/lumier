import { mkdir } from "node:fs/promises";
import path from "node:path";
import { confirm, isCancel, note, outro, tasks } from "@clack/prompts";
// biome-ignore lint/performance/noNamespaceImport: doesn't matter
import * as Bun from "bun";
import {
  CONFIG_FILENAME,
  colors,
  GITIGNORE_FILENAME,
  PACKAGE_JSON_FILENAME,
  STATE_DIR_NAME,
} from "../lib/constants.js";
import { CONFIG_TEMPLATE } from "../lib/template.js";
import { ensureFileContains } from "../lib/utils.js";

const ROOT_DIR = process.cwd();
const LUMIER_DIR = path.join(ROOT_DIR, STATE_DIR_NAME);
const GITIGNORE_PATH = path.join(ROOT_DIR, GITIGNORE_FILENAME);
const CONFIG_PATH = path.join(ROOT_DIR, CONFIG_FILENAME);
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, PACKAGE_JSON_FILENAME);

export async function init() {
  const [configExists, lumierDirExists, gitignoreExists, gitignoreContent, packageJson] = await Promise.all([
    Bun.file(CONFIG_PATH).exists(),
    Bun.file(LUMIER_DIR).exists(),
    Bun.file(GITIGNORE_PATH).exists(),
    Bun.file(GITIGNORE_PATH)
      .exists()
      .then((exists) => (exists ? Bun.file(GITIGNORE_PATH).text() : "")),
    Bun.file(PACKAGE_JSON_PATH)
      .json()
      .catch(() => ({})),
  ]);

  const appName = packageJson?.name || "my-app";
  const gitignoreNeedsUpdate = !gitignoreContent.includes(STATE_DIR_NAME);

  const configExistsMessage = configExists
    ? `${colors.dim}○${colors.reset} ${CONFIG_FILENAME} ${colors.dim}(already exists, skip)${colors.reset}`
    : `${colors.green}+${colors.reset} Create ${colors.cyan}${CONFIG_FILENAME}${colors.reset} - infrastructure config`;

  const lumierDirExistsMessage = lumierDirExists
    ? `${colors.dim}○${colors.reset} ${STATE_DIR_NAME}/ ${colors.dim}(already exists, skip)${colors.reset}`
    : `${colors.green}+${colors.reset} Create ${colors.cyan}${STATE_DIR_NAME}/${colors.reset} directory - local state & secrets`;

  const gitignoreMessage = !gitignoreNeedsUpdate
    ? `${colors.dim}○${colors.reset} ${GITIGNORE_FILENAME} ${colors.dim}(already configured, skip)${colors.reset}`
    : gitignoreExists
      ? `${colors.green}+${colors.reset} Update ${colors.cyan}${GITIGNORE_FILENAME}${colors.reset} - exclude ${STATE_DIR_NAME}/ from git`
      : `${colors.green}+${colors.reset} Create ${colors.cyan}${GITIGNORE_FILENAME}${colors.reset} - exclude ${STATE_DIR_NAME}/ from git`;

  note(
    `${configExistsMessage}
${lumierDirExistsMessage}
${gitignoreMessage}`,
    `${colors.bold}What this does:`
  );

  const shouldProceed = await confirm({
    message: "Do you want to continue?",
  });

  if (isCancel(shouldProceed)) {
    process.exit(0);
  }

  if (shouldProceed) {
    await tasks([
      {
        enabled: !configExists,
        title: `${colors.green}+${colors.reset} Create ${colors.cyan}${CONFIG_FILENAME}${colors.reset} - infrastructure config`,
        task: async () => {
          await Bun.write(CONFIG_PATH, CONFIG_TEMPLATE(appName));
          return `${colors.green}+${colors.reset} Created ${CONFIG_FILENAME}`;
        },
      },
      {
        enabled: !lumierDirExists,
        title: `Create ${colors.green}${STATE_DIR_NAME}/${colors.reset} directory`,
        task: async () => {
          await mkdir(LUMIER_DIR, { recursive: true });
          return `${colors.green}+${colors.reset} Created ${STATE_DIR_NAME}/ directory`;
        },
      },
      {
        enabled: gitignoreNeedsUpdate,
        title: gitignoreExists
          ? `${colors.green}+${colors.reset} Update ${colors.cyan}${GITIGNORE_FILENAME}${colors.reset} - exclude ${STATE_DIR_NAME}/ from git`
          : `${colors.green}+${colors.reset} Create ${colors.cyan}${GITIGNORE_FILENAME}${colors.reset} - exclude ${STATE_DIR_NAME}/ from git`,
        task: async () => {
          const result = await ensureFileContains(
            GITIGNORE_PATH,
            `# Lumier local state\n${STATE_DIR_NAME}/\n`,
            `# Lumier local state\n${STATE_DIR_NAME}/\n`
          );
          return result.exists
            ? `${colors.green}~${colors.reset} Updated ${GITIGNORE_FILENAME} to exclude ${STATE_DIR_NAME} from git`
            : `${colors.green}+${colors.reset} Created ${GITIGNORE_FILENAME} to exclude ${STATE_DIR_NAME} from git`;
        },
      },
    ]);

    note(
      `bun run lumier dev      Start dev server with hot reload
bun run lumier deploy   Deploy to Cloudflare

Edit ${CONFIG_FILENAME} to add KV, D1, R2, and other resources.`,
      `Done! Next steps:`
    );
  }

  if (configExists && lumierDirExists && !gitignoreNeedsUpdate) {
    outro("Project already initialized. Nothing to do.");
  }
}
