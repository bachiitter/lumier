---
title: Durable Objects
description: Cloudflare Durable Objects for stateful coordination
---

Durable Objects provide strongly consistent, stateful coordination.

## Basic Usage

```ts
import { $config, Worker, DurableObject } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const api = Worker("api", {
      entry: "src/index.ts",
    });

    const counter = DurableObject("counter", {
      worker: api,
      className: "Counter",
    });

    // Add DO binding to worker
    Worker("api", {
      entry: "src/index.ts",
      bindings: {
        COUNTER: counter,
      },
    });
  },
});
```

## Options

```ts
DurableObject("counter", {
  worker: api,           // Worker containing the DO class
  className: "Counter",  // Class name in the worker
  sqlite: true,          // Use SQLite storage (default: true)
});
```

| Option      | Type           | Default | Description                      |
| ----------- | -------------- | ------- | -------------------------------- |
| `worker`    | `WorkerOutput` | —       | Worker containing the DO class   |
| `className` | `string`       | —       | Durable Object class name        |
| `sqlite`    | `boolean`      | `true`  | Use SQLite instead of KV storage |

## Worker Code

```ts
// src/index.ts
import { env, DurableObject } from "cloudflare:workers";

export class Counter extends DurableObject {
  async increment(): Promise<number> {
    let count = (await this.ctx.storage.get<number>("count")) || 0;
    count++;
    await this.ctx.storage.put("count", count);
    return count;
  }

  async getCount(): Promise<number> {
    return (await this.ctx.storage.get<number>("count")) || 0;
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const id = env.COUNTER.idFromName(url.pathname);
    const stub = env.COUNTER.get(id);

    if (request.method === "POST") {
      const count = await stub.increment();
      return Response.json({ count });
    }

    const count = await stub.getCount();
    return Response.json({ count });
  },
};
```

## SQLite Storage

With `sqlite: true`, use SQL for storage:

```ts
export class ChatRoom extends DurableObject {
  sql = this.ctx.storage.sql;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY,
        user TEXT,
        text TEXT,
        timestamp INTEGER
      )
    `);
  }

  async addMessage(user: string, text: string): Promise<void> {
    this.sql.exec(
      "INSERT INTO messages (user, text, timestamp) VALUES (?, ?, ?)",
      user,
      text,
      Date.now()
    );
  }

  async getMessages(): Promise<Message[]> {
    return this.sql.exec("SELECT * FROM messages ORDER BY timestamp DESC LIMIT 100").toArray();
  }
}
```

## WebSocket Support

Durable Objects can handle WebSocket connections:

```ts
export class ChatRoom extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") === "websocket") {
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Expected WebSocket", { status: 400 });
  }

  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    // Broadcast to all connected clients
    for (const client of this.ctx.getWebSockets()) {
      client.send(message);
    }
  }
}
```

## Output

```ts
interface DurableObjectOutput {
  type: "durable_object";
  name: string;
  className: string;
}
```
