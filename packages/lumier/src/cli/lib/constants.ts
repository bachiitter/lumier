import { userInfo } from "node:os";

/** Default stage name - uses the current OS username */
export const DEFAULT_STAGE = userInfo().username;

/** State directory name (relative to project root) */
export const STATE_DIR_NAME = ".lumier";

/** Gitignore filename */
export const GITIGNORE_FILENAME = ".gitignore";

/** Config filename */
export const CONFIG_FILENAME = "lumier.config.ts";

/** Package JSON filename */
export const PACKAGE_JSON_FILENAME = "package.json";

/** Secrets subdirectory name */
export const SECRETS_DIR_NAME = "secrets";

/** Build output subdirectory name */
export const BUILD_DIR_NAME = "build";

/** Persist data subdirectory name (for dev) */
export const PERSIST_DIR_NAME = "persist";

/** Key file name for encryption */
export const KEY_FILE_NAME = ".key";

/** Resource manifest file name */
export const MANIFEST_FILE_NAME = "resources.json";

// Worker Defaults

/** Default compatibility date for Workers */
export const DEFAULT_COMPATIBILITY_DATE = "2025-11-17";

/** Default compatibility flags for Workers */
export const DEFAULT_COMPATIBILITY_FLAGS = ["nodejs_compat"];

/** Default dev server port */
export const DEFAULT_DEV_PORT = 8787;

// Build Defaults

/** Default resolve conditions for bundling */
export const DEFAULT_RESOLVE_CONDITIONS = ["workerd", "worker", "browser", "import", "default"];

// Terminal Colors

export const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
} as const;

// ============================================================================
// Logging Helpers

/**
 * Log a formatted message with timestamp, icon, and label
 */
export function log(icon: string, label: string, message: string): void {
  const timestamp = new Date().toISOString().split("T")[1]?.slice(0, 8);
  console.log(`${colors.dim}${timestamp}${colors.reset} ${icon} ${colors.cyan}${label}${colors.reset} ${message}`);
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
