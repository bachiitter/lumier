import * as fs from "node:fs/promises";
import * as z from "zod";
import { type BindingValue, type LinkableResource, ResourceNameSchema } from "../../sdk/index.js";
import { colors } from "./constants.js";

export { colors };

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
  let exists = true;
  let currentContent = "";
  try {
    currentContent = await fs.readFile(filePath, "utf-8");
  } catch {
    exists = false;
  }

  if (!exists) {
    await fs.writeFile(filePath, createContent ?? content);
    return { exists: false, updated: true };
  }

  if (!currentContent.includes(content)) {
    // Ensure we start on a new line if the file doesn't end with one
    const prefix = currentContent.endsWith("\n") ? "" : "\n";
    await fs.writeFile(filePath, `${currentContent}${prefix}${content}`);
    return { exists: true, updated: true };
  }

  return { exists: true, updated: false };
}

/**
 * Shared utilities for Lumier CLI
 */

// Re-export for convenience
export { ResourceNameSchema };

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a binding value is a linkable resource (KV, D1, R2, etc.)
 */
export function isLinkableResource(value: BindingValue): value is LinkableResource {
  return typeof value === "object" && value !== null && "type" in value && "_ref" in value;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const RESERVED_STAGES = ["default", "all", "none"] as const;

/**
 * Stage name schema
 */
export const StageNameSchema = z
  .string()
  .trim()
  .min(1, "Stage name cannot be empty")
  .max(32, "Stage name cannot exceed 32 characters")
  .regex(
    /^[a-z][a-z0-9-]*$/i,
    "Stage name must start with a letter and contain only alphanumeric characters and hyphens"
  )
  .refine(
    (value) => !RESERVED_STAGES.includes(value.toLowerCase() as (typeof RESERVED_STAGES)[number]),
    "Stage name is reserved"
  );

/**
 * Port number schema
 */
export const PortSchema = z
  .number()
  .int("Port must be an integer")
  .min(1024, "Port must be >= 1024 (lower ports require root)")
  .max(65535, "Port must be <= 65535");

/**
 * Secret key schema - UPPER_SNAKE_CASE
 */
export const SecretKeySchema = z
  .string()
  .trim()
  .min(1, "Secret key cannot be empty")
  .regex(/^[A-Z_][A-Z0-9_]*$/, "Secret key must be UPPER_SNAKE_CASE (e.g., API_KEY, DATABASE_URL)");

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a resource name
 */
export function validateResourceName(name: string, type: string): void {
  const result = ResourceNameSchema.safeParse(name);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ValidationError(`${type} name "${name}": ${issue?.message ?? "Invalid"}`);
  }
}

/**
 * Validate a stage name
 */
export function validateStageName(stage: string): void {
  const result = StageNameSchema.safeParse(stage);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ValidationError(`Stage "${stage}": ${issue?.message ?? "Invalid"}`);
  }
}

/**
 * Validate a port number
 */
export function validatePort(port: number): void {
  const result = PortSchema.safeParse(port);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ValidationError(`Port ${port}: ${issue?.message ?? "Invalid"}`);
  }
}

/**
 * Validate a secret key name
 */
export function validateSecretKey(key: string): void {
  const result = SecretKeySchema.safeParse(key);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ValidationError(`Secret key "${key}": ${issue?.message ?? "Invalid"}`);
  }
}

/**
 * Parse and validate a port from string input
 */
export function parsePort(value: string | undefined, defaultPort: number = 8787): number {
  if (!value) return defaultPort;

  const port = parseInt(value, 10);
  if (Number.isNaN(port)) {
    throw new ValidationError(`Invalid port: "${value}" is not a number`);
  }

  validatePort(port);
  return port;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a stage is production
 */
export function isProduction(stage: string): boolean {
  return stage === "production" || stage === "prod";
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Custom error class for Lumier CLI errors
 */
export class LumierError extends Error {
  constructor(
    message: string,
    public readonly code: string = "LUMIER_ERROR",
    public readonly hint?: string
  ) {
    super(message);
    this.name = "LumierError";
  }

  format(): string {
    let output = `${colors.red}${colors.bold}Error:${colors.reset} ${this.message}`;
    if (this.hint) {
      output += `\n${colors.dim}${this.hint}${colors.reset}`;
    }
    return output;
  }
}

/**
 * Validation error
 */
export class ValidationError extends LumierError {
  constructor(message: string, hint?: string) {
    super(message, "VALIDATION_ERROR", hint);
    this.name = "ValidationError";
  }
}

// ============================================================================
// Logging Utilities
// ============================================================================

/**
 * Log a formatted message with timestamp, icon, and label
 */
export function log(label: string, message: string): void {
  const timestamp = new Date().toISOString().split("T")[1]?.slice(0, 8);
  console.log(`${colors.dim}${timestamp}${colors.reset} ${colors.cyan}${label}${colors.reset} ${message}`);
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
