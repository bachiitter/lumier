---
title: Getting Started
description: Set up your first Lumier project
---

This guide walks you through creating a Lumier project, defining your first Worker, and deploying it by stage.

## Prerequisites

- Bun or Node.js (18+)
- A Cloudflare account
- Cloudflare API credentials for deploys:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_API_TOKEN`

```bash
bun add lumier
```

If you prefer another package manager:

```bash
npm install lumier
pnpm add lumier
```

## Initialize

```bash
bunx lumier init
```

This creates:

- `lumier.config.ts` — Infrastructure configuration
- `.lumier/` — Local state and build artifacts
- `src/index.ts` — Worker entry point
- `lumier-env.d.ts` — Generated types for Worker bindings

## Project Structure

```
my-app/
├── lumier.config.ts    # Infrastructure definition
├── src/
│   └── index.ts        # Worker entry point
├── .lumier/            # Local state (gitignored)
│   ├── build/          # Compiled workers
│   └── persist/        # Dev data (if applicable)
└── lumier-env.d.ts     # Generated types
```

## Define Your First Worker

Open `lumier.config.ts` and define a Worker:

```ts
import { $config, Worker } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const api = Worker("api", {
      entry: "src/index.ts",
      url: true,
    });

    return { url: api.url };
  },
});
```

Then implement your Worker in `src/index.ts`:

```ts
export default {
  async fetch(request: Request): Promise<Response> {
    return new Response("Hello from Lumier!");
  },
};
```

## Run a Development Stage

Use stages to keep environments isolated (for example: `dev`, `staging`, `production`).

```bash
bunx lumier dev --stage dev
```

You should see a URL printed for your Worker (for example a `workers.dev` URL, or your configured custom domain).

## Preview and Deploy

To preview changes for a protected stage:

```bash
bunx lumier deploy --stage production --preview
```

Then deploy:

```bash
bunx lumier deploy --stage production
```

## Environment Variables

Deploys use Cloudflare’s API. Set these variables in your shell (or in a `.env` file):

```bash
export CLOUDFLARE_ACCOUNT_ID="..."
export CLOUDFLARE_API_TOKEN="..."
```

## Next Steps

- [Configuration](/docs/config) — Learn the config API
- [CLI](/docs/cli) — Available commands
- [Worker](/docs/worker) — Worker options
