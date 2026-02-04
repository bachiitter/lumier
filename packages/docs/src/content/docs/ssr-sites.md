---
title: SSR Sites
description: Deploy server-rendered sites with Lumier
---

Deploy full-stack frameworks like Next.js, Remix, SvelteKit, and Astro on Cloudflare.

Lumier supports two common patterns:

- **Worker-based apps (SSR / edge rendering)** — Use `Worker()` with an entrypoint produced by your framework adapter.
- **Static sites** — Use `StaticSite()` for prebuilt assets.

## Basic Usage

```ts
import { $config, Worker } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const web = Worker("web", {
      entry: "src/index.ts",
      url: true,
      assets: {
        directory: "public",
      },
    });

    return { url: web.url };
  },
});
```

This pattern is useful when your framework outputs a Worker entrypoint plus an assets directory.

## Static Sites

For static sites, use the `StaticSite` function:

```ts
import { $config, StaticSite } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const site = StaticSite("docs", {
      path: "dist",
      domain: "docs.example.com",
    });

    return { url: site.url };
  },
});
```

## StaticSite Options

```ts
StaticSite("docs", {
  path: "dist",                           // Directory with static files
  domain: "docs.example.com",             // Custom domain
  notFoundHandling: "single-page-application",  // SPA mode
  htmlHandling: "auto-trailing-slash",    // URL handling
  buildCommand: "bun run build",          // Pre-deploy build
  buildOutput: "dist",                    // Build output directory
});
```

| Option             | Type     | Default                 | Description                    |
| ------------------ | -------- | ----------------------- | ------------------------------ |
| `path`             | `string` | —                       | Static files directory         |
| `domain`           | `string` | —                       | Custom domain                  |
| `notFoundHandling` | `string` | `"404-page"`            | How to handle 404s             |
| `htmlHandling`     | `string` | `"auto-trailing-slash"` | URL path handling              |
| `buildCommand`     | `string` | —                       | Build command to run           |
| `buildOutput`      | `string` | —                       | Build output directory         |

### Build Hooks

If you set `buildCommand`, Lumier can run your build before deploying. Use `buildOutput` when your build output directory differs from `path`.

### Not Found Handling

| Value                      | Description                           |
| -------------------------- | ------------------------------------- |
| `none`                     | Return 404 status                     |
| `single-page-application`  | Serve index.html for all routes       |
| `404-page`                 | Serve 404.html                        |

### HTML Handling

| Value                   | Description                           |
| ----------------------- | ------------------------------------- |
| `auto-trailing-slash`   | Add slash for directories             |
| `force-trailing-slash`  | Always add trailing slash             |
| `drop-trailing-slash`   | Always remove trailing slash          |
| `none`                  | No URL modification                   |

## SvelteKit Example

```ts
// lumier.config.ts
import { $config, Worker, D1 } from "lumier";

export default $config({
  app() {
    return { name: "my-sveltekit-app" };
  },
  run() {
    const db = D1("database");

    Worker("web", {
      entry: ".svelte-kit/cloudflare/_worker.js",
      url: true,
      assets: {
        directory: ".svelte-kit/cloudflare",
      },
      bindings: {
        DB: db,
      },
    });
  },
});
```

## Remix Example

```ts
// lumier.config.ts
import { $config, Worker, KV } from "lumier";

export default $config({
  app() {
    return { name: "my-remix-app" };
  },
  run() {
    const sessions = KV("sessions");

    Worker("web", {
      entry: "build/server/index.js",
      url: true,
      assets: {
        directory: "build/client",
      },
      bindings: {
        SESSIONS: sessions,
      },
    });
  },
});
```

## Next Steps

- [Worker](/docs/worker) — Worker options and bindings
- [Configuration](/docs/config) — Stage patterns and binding types

## Output

```ts
interface StaticSiteOutput {
  type: "static_site";
  name: string;
  url: string;
}
```
