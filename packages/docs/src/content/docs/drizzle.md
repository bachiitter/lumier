---
title: Drizzle ORM
description: Use Drizzle ORM with D1 and Hyperdrive
---

Drizzle is a TypeScript ORM that works well with Cloudflare D1 (SQLite) and Hyperdrive (Postgres connection pooling). This page shows the common wiring patterns in Lumier.

## D1 with Drizzle

### Install

```bash
bun add drizzle-orm
bun add -d drizzle-kit
```

### Define a Schema

```ts
// src/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content"),
  authorId: integer("author_id").references(() => users.id),
});
```

### Bind D1 in Lumier

```ts
// lumier.config.ts
import { $config, Worker, D1 } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const db = D1("database");

    Worker("api", {
      entry: "src/index.ts",
      bindings: {
        DB: db,
      },
    });
  },
});
```

### Use Drizzle in a Worker

```ts
// src/index.ts
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema";

export default {
  async fetch(request: Request): Promise<Response> {
    const db = drizzle(env.DB, { schema });

    // Select all users
    const allUsers = await db.select().from(schema.users);

    // Select with where
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, 1))
      .get();

    // Insert
    const newUser = await db
      .insert(schema.users)
      .values({ name: "Alice", email: "alice@example.com" })
      .returning()
      .get();

    // Update
    await db
      .update(schema.users)
      .set({ name: "Bob" })
      .where(eq(schema.users.id, 1));

    // Delete
    await db
      .delete(schema.users)
      .where(eq(schema.users.id, 1));

    return Response.json(allUsers);
  },
};
```

### Migrations (D1)

Drizzle generates SQL migrations. Apply them to D1 with Wrangler:

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
```

```bash
# Generate migrations
bunx drizzle-kit generate

# Apply migrations to D1
bunx wrangler d1 migrations apply database
```

## Hyperdrive with Drizzle

### Install

```bash
bun add drizzle-orm postgres
```

### Define a Postgres Schema

```ts
// src/db/schema.ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Bind Hyperdrive in Lumier

```ts
// lumier.config.ts
import { $config, Worker, Hyperdrive } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const pg = Hyperdrive("postgres", {
      // Optional: for local dev servers
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

### Use Drizzle + postgres-js

```ts
// src/index.ts
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";

export default {
  async fetch(request: Request): Promise<Response> {
    const client = postgres(env.DB.connectionString);
    const db = drizzle(client, { schema });

    const users = await db.select().from(schema.users);

    return Response.json(users);
  },
};
```

## Relations

```ts
// src/db/schema.ts
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

```ts
// Query with relations
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
});
```

## Next Steps

- [D1](/docs/d1) — D1 usage patterns
- [Hyperdrive](/docs/hyperdrive) — Hyperdrive configuration
