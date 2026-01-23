/**
 * Build Workers using Rolldown
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { rolldown } from "rolldown";
import { cloudflare, env, nodeless } from "unenv";
import type { ResourceRegistry } from "../../sdk/index.js";
import type { BuildManifest } from "./types.js";
import { formatBytes, LumierError, log } from "./utils.js";

const ENV_ACCESS_PATTERN = /\benv\.(\w+)\b/g;

export interface BuildContext {
  stage: string;
  minify?: boolean;
  rootDir: string;
  lumierDir: string;
  silent?: boolean;
}

const cloudflareExternalsRegex = /^cloudflare:/;

export async function build(config: ResourceRegistry, options: BuildContext): Promise<BuildManifest> {
  const { stage, rootDir, lumierDir, silent = false } = options;
  const isProd = options.minify ?? stage === "production";
  const buildDir = path.join(lumierDir, "build");

  await fs.mkdir(buildDir, { recursive: true });

  const manifest: BuildManifest = {
    timestamp: new Date().toISOString(),
    stage,
    workers: [],
  };

  // Build Workers
  for (const worker of config.workers) {
    const { name, options: workerOpts } = worker;
    if (!silent) log(`->  ${name}`, `Building ${workerOpts.entry}...`);

    const workerDir = path.join(buildDir, name);
    await fs.mkdir(workerDir, { recursive: true });
    const outfile = path.join(workerDir, `${name}.js`);

    try {
      const buildOpts = workerOpts.build ?? {};
      const conditions = buildOpts.conditions ?? ["workerd", "worker", "browser", "import", "default"];

      const hasNodeCompat = workerOpts.compatibilityFlags?.includes("nodejs_compat") ?? false;
      const nodePolyfills = hasNodeCompat ? env(nodeless, cloudflare, {}) : null;

      const nodeEnvReplacement = JSON.stringify(isProd ? "production" : "development");

      // Cloudflare runtime modules should never be bundled
      const cloudflareExternals = [cloudflareExternalsRegex];
      const userExternals = buildOpts.external ?? [];
      const external = [...cloudflareExternals, ...userExternals];

      const bundle = await rolldown({
        input: path.join(rootDir, workerOpts.entry),
        platform: "browser",
        resolve: {
          conditionNames: conditions,
          alias: nodePolyfills?.alias,
        },
        external,
        transform: {
          define: {
            "process.env.NODE_ENV": nodeEnvReplacement,
            "global.process.env.NODE_ENV": nodeEnvReplacement,
            "globalThis.process.env.NODE_ENV": nodeEnvReplacement,
            ...buildOpts.define,
          },
          target: "es2024",
        },
      });

      await bundle.write({
        cleanDir: true,
        file: outfile,
        format: "esm",
        keepNames: true,
        minify: buildOpts.minify ?? isProd,
        banner: buildOpts.banner,
        footer: buildOpts.footer,
        sourcemap: buildOpts.sourcemap ?? true,
      });

      await bundle.close();

      const stat = await fs.stat(outfile);
      const bundleSize = stat.size;

      const bundledCode = await fs.readFile(outfile, "utf-8");
      const configuredBindings = new Set(Object.keys(workerOpts.bindings ?? {}));
      const usedBindings = new Set<string>();

      let match: RegExpExecArray | null;
      while ((match = ENV_ACCESS_PATTERN.exec(bundledCode)) !== null) {
        usedBindings.add(match[1]!);
      }

      const missingBindings: string[] = [];
      for (const binding of usedBindings) {
        if (!configuredBindings.has(binding)) {
          missingBindings.push(binding);
        }
      }

      if (missingBindings.length > 0) {
        throw new LumierError(
          `Worker "${name}" uses bindings that are not configured: ${missingBindings.join(", ")}\n` +
            `Add them to the worker's bindings in lumier.config.ts`,
          "MISSING_BINDINGS"
        );
      }

      manifest.workers.push({ name, entry: workerOpts.entry, outputPath: outfile, bundleSize });
      if (!silent) log(`+ ${name}`, `Built (${formatBytes(bundleSize)})`);
    } catch (err) {
      log(`x ${name}`, `Failed: ${err}`);
      throw err;
    }
  }

  await fs.writeFile(path.join(buildDir, "build-manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}
