---
title: Getting Started
description: Set up your first Lumier project
---

## Prerequisites

- Node.js 18+ or Bun runtime
- Cloudflare account (for deployment)

## Installation

```bash
npm install lumier
# or
pnpm add lumier
# or
bun add lumier
```

## Initialize

```bash
npx lumier init
```

This creates:

- `lumier.config.ts` — Infrastructure configuration
- `.lumier/` — Local state and build artifacts
- `src/index.ts` — Worker entry point

## Project Structure

```
my-app/
├── lumier.config.ts    # Infrastructure definition
├── src/
│   └── index.ts        # Worker entry point
├── .lumier/            # Local state (gitignored)
│   ├── build/          # Compiled workers
│   └── persist/        # Local dev data
└── lumier-env.d.ts     # Generated types
```

## First Worker

Edit `lumier.config.ts`:

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

Edit `src/index.ts`:

```ts
export default {
  async fetch(request: Request): Promise<Response> {
    return new Response("Hello from Lumier!");
  },
};
```

## Development

Start the dev server:

```bash
npx lumier dev
```

The server starts at `http://localhost:8787` with hot reload enabled.

## Next Steps

- [Configuration](/docs/config) — Learn the config API
- [CLI](/docs/cli) — Available commands
- [Worker](/docs/worker) — Worker options
