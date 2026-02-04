---
title: Hyperdrive
description: Cloudflare Hyperdrive for PostgreSQL connection pooling
---

Hyperdrive provides PostgreSQL connection pooling for Workers. It helps you connect to a Postgres database efficiently from the edge, reducing connection overhead and smoothing spikes.

Use Hyperdrive when:

- Your database has strict connection limits
- You want predictable latency from Workers to Postgres
- You’re running Postgres behind a private network or managed provider

## Basic Usage

```ts
import { $config, Worker, Hyperdrive } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const pg = Hyperdrive("postgres", {
      // Optional: used when running a local dev server
      localConnectionString: "postgres://localhost:5432/mydb",
    });

    Worker("api", {
      entry: "src/index.ts",
      bindings: {
        DB: pg,
      },
    });
  },
});
```

## Options

```ts
Hyperdrive("postgres", {
  localConnectionString: "postgres://localhost:5432/mydb",
  caching: {
    disabled: false,
    maxAge: 60,
    staleWhileRevalidate: 15,
  },
});
```

| Option                  | Type     | Description                                    |
| ----------------------- | -------- | ---------------------------------------------- |
| `localConnectionString` | `string` | Connection string for local dev server         |
| `caching`               | `object` | Query caching configuration (production only)  |

### Caching Options

| Option                 | Type      | Description                    |
| ---------------------- | --------- | ------------------------------ |
| `disabled`             | `boolean` | Disable caching entirely       |
| `maxAge`               | `number`  | Cache TTL in seconds           |
| `staleWhileRevalidate` | `number`  | Stale cache grace period       |

## How It Works

At deploy time, Hyperdrive is configured on Cloudflare and exposed to your Worker as a binding. Your Worker uses `env.DB.connectionString` to connect through Hyperdrive.

If you run a local dev server, `localConnectionString` lets your Worker connect directly to a database without going through Hyperdrive.

> **Note:** If you run a local dev server and `localConnectionString` is not provided, the binding may be skipped.

## Using Existing Config

```ts
const pg = Hyperdrive.existing("postgres", {
  id: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
});
```

## Worker Code

```ts
// src/index.ts
import { env } from "cloudflare:workers";
import postgres from "postgres";

export default {
  async fetch(request: Request): Promise<Response> {
    // Use Hyperdrive connection string
    const sql = postgres(env.DB.connectionString);

    const users = await sql`SELECT * FROM users LIMIT 10`;

    return Response.json(users);
  },
};
```

## With Drizzle ORM

```ts
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export default {
  async fetch(request: Request): Promise<Response> {
    const client = postgres(env.DB.connectionString);
    const db = drizzle(client, { schema });

    const users = await db.select().from(schema.users).limit(10);

    return Response.json(users);
  },
};
```

## Output

```ts
interface HyperdriveOutput {
  type: "hyperdrive";
  name: string;
}
```

## Next Steps

- [Drizzle](/docs/drizzle) — Using Drizzle ORM with Hyperdrive
- [Worker](/docs/worker) — Binding resources to Workers
