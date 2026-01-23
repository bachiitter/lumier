---
title: Configuration
description: Configure your Lumier infrastructure
---

Lumier uses a `lumier.config.ts` file at your project root.

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
    // Define resources here
    return { /* outputs */ };
  },
});
```

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
