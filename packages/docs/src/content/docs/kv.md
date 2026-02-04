---
title: KV
description: Cloudflare Workers KV key-value store
---

KV is Cloudflare’s global, low-latency key-value store. It’s a great fit for cache-ish workloads, small pieces of shared state, and read-heavy data.

Use KV when you want:

- Fast global reads
- Simple key/value access from Workers
- Low operational overhead

## Basic Usage

```ts
import { $config, Worker, KV } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run(ctx) {
    const cache = KV("cache");

    Worker("api", {
      entry: "src/index.ts",
      bindings: {
        CACHE: cache,
        STAGE: ctx.stage,
      },
    });
  },
});
```

## Options

```ts
KV("cache", {
  // Currently no additional options
});
```

## Key Design

KV doesn’t enforce structure—your keys do. A common pattern is prefixing keys by stage or namespace:

```ts
const key = `${env.STAGE}:user:${userId}`;
await env.CACHE.put(key, JSON.stringify(user));
```

## Using Existing Namespace

Reference a KV namespace not managed by Lumier:

```ts
const cache = KV.existing("cache", {
  id: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
});
```

## Worker Code

```ts
// src/index.ts
import { env } from "cloudflare:workers";

export default {
  async fetch(request: Request): Promise<Response> {
    // Get value
    const value = await env.CACHE.get("key");

    // Get with metadata
    const { value: data, metadata } = await env.CACHE.getWithMetadata("key");

    // Put value
    await env.CACHE.put("key", "value", {
      expirationTtl: 3600,  // 1 hour
      metadata: { version: 1 },
    });

    // Delete
    await env.CACHE.delete("key");

    // List keys
    const { keys } = await env.CACHE.list({ prefix: "user:" });

    return Response.json({ value, keys });
  },
};
```

## Data Types

KV supports multiple value types:

```ts
// String
await env.CACHE.put("text", "hello");
const text = await env.CACHE.get("text");

// JSON
await env.CACHE.put("json", JSON.stringify({ foo: "bar" }));
const json = await env.CACHE.get("json", { type: "json" });

// ArrayBuffer
await env.CACHE.put("binary", new ArrayBuffer(8));
const binary = await env.CACHE.get("binary", { type: "arrayBuffer" });

// Stream
const stream = await env.CACHE.get("large", { type: "stream" });
```

## When Not to Use KV

KV is optimized for global reads and simple access patterns. If you need:

- Strong consistency for writes
- Complex queries
- Relational data modeling

Use [D1](/docs/d1) or another database instead.

## Output

```ts
interface KVOutput {
  type: "kv";
  name: string;
  namespaceId: string;
}
```

## Next Steps

- [Configuration](/docs/config) — Bindings and stage patterns
- [Worker](/docs/worker) — Binding resources to Workers
