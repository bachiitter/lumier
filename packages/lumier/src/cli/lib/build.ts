/**
 * Build Workers using Rolldown
 */

import * as fs from "node:fs";
import { mkdir } from "node:fs/promises";
import * as path from "node:path";
import type { ResourceRegistry } from "lumier";
import { rolldown } from "rolldown";
import { cloudflare, env, nodeless } from "unenv";
import type { BuildManifest } from "./types.js";
import { formatBytes, log } from "./utils.js";

export interface BuildContext {
  stage: string;
  minify?: boolean;
  rootDir: string;
  lumierDir: string;
}

const cloudflareExternalsRegex = /^cloudflare:/;

export async function build(config: ResourceRegistry, options: BuildContext): Promise<BuildManifest> {
  const { stage, rootDir, lumierDir } = options;
  const isProd = options.minify ?? stage === "production";
  const buildDir = path.join(lumierDir, "build");

  await mkdir(buildDir, { recursive: true });

  const manifest: BuildManifest = {
    timestamp: new Date().toISOString(),
    stage,
    workers: [],
  };

  // Build Workers
  for (const worker of config.workers) {
    const { name, options: workerOpts } = worker;
    log(`->  ${name}`, `Building ${workerOpts.entry}...`);

    const workerDir = path.join(buildDir, name);
    await mkdir(workerDir, { recursive: true });
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

      const bundleSize = fs.statSync(outfile).size;
      manifest.workers.push({ name, entry: workerOpts.entry, outputPath: outfile, bundleSize });
      log(`+ ${name}`, `Built (${formatBytes(bundleSize)})`);
    } catch (err) {
      log(`x ${name}`, `Failed: ${err}`);
      throw err;
    }
  }

  fs.writeFileSync(path.join(buildDir, "build-manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}
