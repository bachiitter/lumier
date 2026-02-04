---
title: Worker
description: Create and configure Cloudflare Workers
---

Workers are the compute primitive on Cloudflare. In Lumier, you use the `Worker()` function to define a Worker script, attach bindings, and optionally expose a URL.

## Basic Usage

```ts
import { $config, Worker } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run(ctx) {
    const api = Worker("api", {
      entry: "src/index.ts",
      url: true,
      bindings: {
        STAGE: ctx.stage,
      },
    });

    return { url: api.url };
  },
});
```

## Naming and Stages

Workers are named using your `app().name`, the current `--stage`, and the Worker name you pass to `Worker("...")`. This keeps environments isolated and makes it obvious which stage a Worker belongs to.

## Options

| Option              | Type                | Description                                    |
| ------------------- | ------------------- | ---------------------------------------------- |
| `entry`             | `string`            | Entry point file path (required)               |
| `url`               | `boolean`           | Enable workers.dev URL                         |
| `domain`            | `string`            | Custom domain                                  |
| `bindings`          | `Record<string, T>` | Resource and environment bindings              |
| `assets`            | `{ directory }`     | Static assets directory                        |
| `build`             | `BuildOptions`      | Build configuration                            |
| `compatibilityDate` | `string`            | Compatibility date (default: `2025-11-17`)     |
| `compatibilityFlags`| `string[]`          | Compatibility flags (default: `nodejs_compat`) |
| `observability`     | `object`            | Logging and tracing config                     |
| `placement`         | `{ mode }`          | Placement mode (`smart` or `off`)              |
| `logpush`           | `boolean`           | Enable logpush                                 |

### URLs

- Set `url: true` to expose the `workers.dev` URL and have Lumier return it as `worker.url`.
- Set `domain` when you want the Worker reachable at a custom hostname.

## Bindings

Connect resources and environment variables to your Worker:

```ts
const api = Worker("api", {
  entry: "src/index.ts",
  bindings: {
    // Resources
    DB: D1("database"),
    CACHE: KV("cache"),
    UPLOADS: Bucket("uploads"),
    JOBS: Queue("jobs"),

    // Environment variables
    STAGE: ctx.stage,
    VERSION: "1.0.0",

    // Secrets
    API_KEY: Secret("API_KEY"),

    // Special bindings
    AI: { type: "ai" },
  },
});
```

### Service Bindings (Multi-Worker)

When you build multiple Workers, you can bind one Worker to another (service binding) so they can call each other without leaving Cloudflare:

```ts
const api = Worker("api", { entry: "src/api.ts" });

const web = Worker("web", {
  entry: "src/web.ts",
  bindings: {
    API: api,
  },
});
```

## Build Options

Customize the bundler:

```ts
Worker("api", {
  entry: "src/index.ts",
  build: {
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    external: ["some-package"],
    sourcemap: true,
    minify: true,
  },
});
```

| Option       | Type                   | Description                        |
| ------------ | ---------------------- | ---------------------------------- |
| `define`     | `Record<string, string>` | Compile-time constants           |
| `external`   | `string[]`             | Packages to exclude from bundle    |
| `sourcemap`  | `boolean`              | Enable sourcemaps (default: true)  |
| `minify`     | `boolean`              | Minify output                      |
| `conditions` | `string[]`             | Custom resolve conditions          |
| `banner`     | `string`               | Banner comment to prepend          |
| `footer`     | `string`               | Footer comment to append           |

## Assets

Serve static files alongside your Worker:

```ts
Worker("web", {
  entry: "src/index.ts",
  assets: {
    directory: "public",
  },
});
```

This is useful for:

- Static sites and SPA builds
- Framework adapters that emit an assets directory alongside a Worker entry

## Observability

Configure logging and tracing:

```ts
Worker("api", {
  entry: "src/index.ts",
  observability: {
    enabled: true,
    headSamplingRate: 0.1,
    logs: {
      enabled: true,
      invocationLogs: true,
    },
  },
});
```

## Output

The `Worker` function returns:

```ts
interface WorkerOutput {
  type: "worker";
  name: string;
  url: string;  // workers.dev URL
}
```

## Worker Code

```ts
// src/index.ts
import { env } from "cloudflare:workers";

export default {
  async fetch(request: Request): Promise<Response> {
    // Access bindings via env
    const data = await env.DB.prepare("SELECT * FROM users").all();
    await env.CACHE.put("key", "value");
    
    return Response.json(data);
  },
};
```

## Next Steps

- [Configuration](/docs/config) — Binding types and stage patterns
- [D1](/docs/d1), [KV](/docs/kv), [Bucket (R2)](/docs/bucket) — Storage resources
