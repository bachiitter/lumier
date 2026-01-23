---
title: Hyperdrive
description: Cloudflare Hyperdrive for PostgreSQL connection pooling
---

Hyperdrive accelerates PostgreSQL queries with connection pooling and caching.

## Basic Usage

```ts
import { $config, Worker, Hyperdrive } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const pg = Hyperdrive("postgres", {
      connectionString: "postgres://user:pass@host:5432/db",
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
  connectionString: "postgres://user:pass@host:5432/db",
  caching: {
    disabled: false,
    maxAge: 60,
    staleWhileRevalidate: 15,
  },
});
```

| Option             | Type     | Description                    |
| ------------------ | -------- | ------------------------------ |
| `connectionString` | `string` | PostgreSQL connection string   |
| `caching`          | `object` | Query caching configuration    |

### Caching Options

| Option                 | Type      | Description                    |
| ---------------------- | --------- | ------------------------------ |
| `disabled`             | `boolean` | Disable caching entirely       |
| `maxAge`               | `number`  | Cache TTL in seconds           |
| `staleWhileRevalidate` | `number`  | Stale cache grace period       |

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

## Connection String

Hyperdrive provides an optimized connection string:

```ts
// Original: postgres://user:pass@remote-host:5432/db
// Hyperdrive: postgres://user:pass@hyperdrive-host:5432/db

const connectionString = env.DB.connectionString;
```

## Output

```ts
interface HyperdriveOutput {
  type: "hyperdrive";
  name: string;
}
```
