---
title: Introduction
description: Infrastructure as Code toolkit for building full stack apps using Cloudflare
---

Lumier is an Infrastructure as Code toolkit for building full-stack applications on Cloudflare. It provides a type-safe, declarative way to define Workers, storage, databases, and other Cloudflare resources.

## Features

- **Type-safe configuration** — Define infrastructure in TypeScript with full autocomplete
- **Local development** — Hot-reload dev server powered by Miniflare
- **Unified bindings** — Connect Workers to KV, D1, R2, Queues, and more
- **Generated types** — Automatic `Env` types for your Workers
- **Stage support** — Isolated environments for development, staging, and production

## Quick Start

```bash
# Install
npm install lumier

# Initialize project
npx lumier init

# Start dev server
npx lumier dev
```

## Example

```ts
// lumier.config.ts
import { $config, Worker, D1, KV } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run(ctx) {
    const db = D1("database");
    const cache = KV("cache");

    const api = Worker("api", {
      entry: "src/index.ts",
      url: true,
      bindings: {
        DB: db,
        CACHE: cache,
        STAGE: ctx.stage,
      },
    });

    return { url: api.url };
  },
});
```

## Resources

Lumier supports all major Cloudflare resources:

| Resource          | Description                    |
| ----------------- | ------------------------------ |
| Worker            | Cloudflare Worker              |
| D1                | SQLite Database                |
| KV                | Key-Value Store                |
| Bucket (R2)       | Object Storage                 |
| Queue             | Message Queue                  |
| Vectorize         | Vector Database                |
| Durable Objects   | Stateful Actors                |
| Hyperdrive        | PostgreSQL Connection Pooling  |
| Static Sites      | Static Asset Hosting           |
