// biome-ignore lint/performance/noNamespaceImport: doesn't matter
import * as Bun from "bun";
import { colors } from "./constants.js";

/**
 * Ensures a file contains a specific string.
 * If the file doesn't exist, it creates it with the content.
 * If it exists but lacks the content, it appends it.
 *
 * @param filePath Absolute path to the file
 * @param content Content to ensure exists
 * @param createContent Content to write if file is created (defaults to content)
 * @returns Object indicating if the file was created or updated
 */
export async function ensureFileContains(
  filePath: string,
  content: string,
  createContent?: string
): Promise<{ exists: boolean; updated: boolean }> {
  const file = Bun.file(filePath);
  const exists = await file.exists();

  if (!exists) {
    await Bun.write(filePath, createContent ?? content);
    return { exists: false, updated: true };
  }

  const currentContent = await file.text();
  if (!currentContent.includes(content)) {
    // Ensure we start on a new line if the file doesn't end with one
    const prefix = currentContent.endsWith("\n") ? "" : "\n";
    await Bun.write(filePath, `${currentContent}${prefix}${content}`);
    return { exists: true, updated: true };
  }

  return { exists: true, updated: false };
}

// Verbose logging - enabled with --verbose or DEBUG=1
let verbose = false;

export function log(...args: unknown[]): void {
  if (verbose) {
    console.log(`${colors.dim}[lumier]${colors.reset}`, ...args);
  }
}
