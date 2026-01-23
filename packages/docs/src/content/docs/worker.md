---
title: Worker
description: Create and configure Cloudflare Workers
---

Workers are the compute primitive in Cloudflare. Use the `Worker` function to define them.

## Basic Usage

```ts
import { $config, Worker } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const api = Worker("api", {
      entry: "src/index.ts",
      url: true,
    });

    return { url: api.url };
  },
});
```

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
