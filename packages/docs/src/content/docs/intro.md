---
title: What is Lumier?
description: TypeScript infrastructure as code for Cloudflare
---

Lumier is an infrastructure as code (IaC) tool for Cloudflare. You define Workers and Cloudflare resources in a single TypeScript config, and Lumier turns that config into a repeatable workflow: preview, deploy, and destroy—per stage.

## The Model

Lumier is built around one file:

- `lumier.config.ts` — A typed, programmatic definition of your Cloudflare stack.

Instead of writing JSON/YAML, you write TypeScript. That means you can:

- Use real code for composition (functions, conditionals, reuse)
- Keep infra and app bindings in sync with generated types
- Share the same config across stages without copying files

## Core Concepts

### Stages

A **stage** is an isolated environment (for example: `dev`, `staging`, `production`). Stages let you deploy the same stack multiple times safely, without cloning configs or hand-editing names.

You’ll use stage names in commands like:

```bash
bunx lumier dev --stage dev
bunx lumier deploy --stage production
```

### Resources and Bindings

Resources (Workers, D1, KV, R2, etc.) are defined in `lumier.config.ts`. You can then attach them to Workers as **bindings**, so application code stays strongly typed and consistent with your infrastructure.

### Config Structure

Most Lumier projects export a single config object:

- `app()` describes global project settings like a name and safety protections.
- `run(ctx)` is the stage-aware entrypoint where you define resources and connect them together.

The `ctx` argument gives you access to the current stage so you can safely vary behavior between environments (for example, enabling protections in `production`).

### Preview, Deploy, Destroy

Lumier is designed around a small set of lifecycle actions:

- **Preview** — inspect what would change before you apply it
- **Deploy** — create/update Cloudflare resources for a stage
- **Destroy** — remove resources for a stage (useful for ephemeral stages)

## What You Get

- **Typed infrastructure** — Autocomplete, validations, and generated types across your stack.
- **Stage workflows** — Separate environments for development, staging, and production without duplicating configs.
- **One command surface** — Init, preview, deploy, destroy, and secrets from the same CLI.
- **Live dev on Workers** — Develop against a dev stage on Cloudflare Workers (not emulation), with a tight iteration loop.

## What You Define

Lumier focuses on the Cloudflare primitives you use to ship applications:

- Workers
- D1
- KV
- R2
- Queues
- Durable Objects
- Vectorize
- Hyperdrive
- Static Sites

## Quick Start

```bash
# Initialize a new Lumier project (creates lumier.config.ts)
bunx lumier init

# Run a development stage on Cloudflare Workers
bunx lumier dev --stage dev

# Preview and deploy to production
bunx lumier deploy --stage production --preview
bunx lumier deploy --stage production
```

## Example

```ts
// lumier.config.ts
import { $config, D1, KV, Worker } from "lumier";

export default $config({
  app() {
    return {
      name: "edge-app",
      protect: ["production"],
    };
  },
  run(ctx) {
    const db = D1("database");
    const cache = KV("cache");

    const api = Worker("api", {
      entry: "src/index.ts",
      bindings: {
        DB: db,
        CACHE: cache,
        STAGE: ctx.stage,
      },
      url: true,
    });

    return { url: api.url };
  },
});
```

## Stages and Safety

Lumier is designed to make the “easy thing” safe:

- Stages keep experimental work isolated from production.
- `protect: ["production"]` adds a guardrail so destructive operations on production require extra intent.

## Secrets

Use the `secret` commands to manage encrypted values per stage (for example, API keys). Secrets are intended to be injected into your Workers at deploy time so your config stays in source control without leaking credentials.

## Project Files

After `bunx lumier init`, you’ll typically have:

| Path | Purpose |
| --- | --- |
| `lumier.config.ts` | Your infrastructure definition |
| `.lumier/` | Local state and build artifacts |
| `lumier-env.d.ts` | Generated Worker `Env` types |

## Next Steps

- Start with the Getting Started guide.
- Browse the CLI reference for commands and flags.
