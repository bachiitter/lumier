/**
 * CLI-specific Type Definitions
 *
 * Internal types used by the CLI that extend the SDK types.
 */

// ============================================================================
// Build Manifest
// ============================================================================

export interface WorkerBuildInfo {
  name: string;
  entry: string;
  outputPath: string;
  bundleSize: number;
}

export interface BuildManifest {
  timestamp: string;
  stage: string;
  workers: WorkerBuildInfo[];
}
