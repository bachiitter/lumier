---
title: Configuration
description: Configure your Lumier infrastructure
---

Lumier uses a single `lumier.config.ts` file at your project root. The file is TypeScript: you can compose infrastructure with real code, and Lumier can generate types for Worker bindings.

## Basic Structure

```ts
import { $config } from "lumier";

export default $config({
  app() {
    return {
      name: "my-app",
      protect: ["production"],
    };
  },
  run(ctx) {
    // Define resources here and return any useful outputs
    return {};
  },
});
```

## How It Runs

When you run Lumier commands, Lumier:

1. Loads `lumier.config.ts`
2. Calls `app()` to get global settings
3. Calls `run(ctx)` with a stage-aware context
4. Builds a resource graph and applies the requested action (preview/deploy/etc.)

Because `run(ctx)` is just code, you can branch safely by stage, reuse helper functions, and keep everything in one place.

## App Configuration

The `app` function returns your application settings:

```ts
app() {
  return {
    name: "my-app",           // Required: App name (used in resource naming)
    protect: ["production"],  // Optional: Protected stages
  };
}
```

| Property  | Type       | Description                                      |
| --------- | ---------- | ------------------------------------------------ |
| `name`    | `string`   | Application name, used as prefix for resources   |
| `protect` | `string[]` | Stages that require confirmation before changes  |

### Stage Protection

The `protect` list is a guardrail. If a stage is protected, destructive actions require extra intent. This is commonly used for `production`.

## Runtime Context

The `run` function receives a context object:

```ts
run(ctx) {
  console.log(ctx.stage);        // Current stage (e.g., "dev", "production")
  console.log(ctx.isProduction); // true if stage === "production"
  console.log(ctx.isDev);        // true if not production
  console.log(ctx.app);          // App config from app()
}
```

| Property       | Type        | Description                      |
| -------------- | ----------- | -------------------------------- |
| `stage`        | `string`    | Current deployment stage         |
| `isProduction` | `boolean`   | True if stage is "production"    |
| `isDev`        | `boolean`   | True if not production           |
| `app`          | `AppConfig` | App configuration                |

### Stage-Aware Config

Use `ctx.stage` (or `ctx.isProduction`) to safely vary behavior:

```ts
run(ctx) {
  const enableLogs = !ctx.isProduction;

  // Example: use a different domain per stage
  const domain = ctx.isProduction ? "api.example.com" : undefined;

  return { enableLogs, domain };
}
```

## Bindings

Bindings connect resources to Workers:

```ts
const api = Worker("api", {
  entry: "src/index.ts",
  bindings: {
    // Resources
    DB: D1("database"),
    CACHE: KV("cache"),
    UPLOADS: Bucket("uploads"),

    // Plain text
    STAGE: ctx.stage,

    // Secrets
    API_KEY: Secret("API_KEY"),

    // Manual bindings
    AI: { type: "ai" },
  },
});
```

### Binding Types

| Type          | Example                                  |
| ------------- | ---------------------------------------- |
| Resource      | `D1("db")`, `KV("cache")`, `Bucket("r2")` |
| String        | `ctx.stage`, `"production"`              |
| Secret        | `Secret("API_KEY")`                      |
| AI            | `{ type: "ai" }`                         |
| Browser       | `{ type: "browser" }`                    |
| Plain text    | `{ type: "plain_text", value: "..." }`   |
| Secret text   | `{ type: "secret_text", value: "..." }`  |
| JSON          | `{ type: "json", value: { ... } }`       |
| Service       | `{ type: "service", service: "..." }`    |

### Binding Tips

- Prefer binding resources (like `D1("database")`) over manually wiring IDs in app code.
- Use `Secret("NAME")` for values that must not be committed.
- Keep binding names stable: changing a binding name changes your Worker’s `Env` type.

## Outputs

Return values from `run` are available as outputs:

```ts
run(ctx) {
  const api = Worker("api", { entry: "src/index.ts", url: true });
  
  return {
    url: api.url,
    stage: ctx.stage,
  };
}
```

Outputs are useful for:

- Exposing URLs for apps and webhooks
- Debugging stage-specific values
- Passing values to external tools (for example via a “shell” or output command)

## Using Existing Resources

Reference resources not managed by Lumier:

```ts
const db = D1.existing("database", {
  id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
});

const cache = KV.existing("cache", {
  id: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
});

const bucket = Bucket.existing("uploads", {
  bucketName: "my-existing-bucket",
});
```

## Recommended Layout

As your config grows, keep it readable:

- Put core resources at the top (databases, KV, buckets, queues)
- Define Workers next, binding resources explicitly
- Return outputs at the end

For larger stacks, factor helpers:

```ts
function ApiWorker(ctx: RuntimeContext) {
  return Worker("api", {
    entry: "src/index.ts",
    bindings: { STAGE: ctx.stage },
  });
}
```
