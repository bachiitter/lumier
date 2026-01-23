---
title: CLI
description: Lumier command-line interface
---

## Commands

### `init`

Initialize a new Lumier project:

```bash
bunx lumier init
```

Creates `lumier.config.ts`, `.lumier/` directory, and `src/index.ts`.

### `dev`

Start the local development server:

```bash
bunx lumier dev
```

Options:

| Flag              | Description                          |
| ----------------- | ------------------------------------ |
| `--stage <name>`  | Stage name (default: OS username)    |
| `--port <number>` | Dev server port (default: 8787)      |
| `--verbose`       | Enable verbose logging               |

The dev server uses Miniflare to emulate Cloudflare Workers locally with:

- Hot reload on file changes
- Local KV, D1, R2 persistence in `.lumier/persist/`
- Automatic type generation

### `deploy`

Deploy to Cloudflare:

```bash
bunx lumier deploy
```

Options:

| Flag              | Description                          |
| ----------------- | ------------------------------------ |
| `--stage <name>`  | Stage to deploy (default: OS username) |
| `--preview`       | Preview changes without deploying    |

### `destroy`

Tear down deployed resources:

```bash
bunx lumier destroy --stage production
```

### `secret`

Manage encrypted secrets:

```bash
# Set a secret
bunx lumier secret set API_KEY

# List secrets
bunx lumier secret list

# Remove a secret
bunx lumier secret remove API_KEY
```

### `version`

Show the Lumier version:

```bash
bunx lumier version
```

## Environment Variables

| Variable | Description               |
| -------- | ------------------------- |
| `DEBUG`  | Set to `1` for debug logs |

## Project Files

| Path               | Description                    |
| ------------------ | ------------------------------ |
| `lumier.config.ts` | Infrastructure configuration   |
| `.lumier/`         | Local state directory          |
| `.lumier/build/`   | Compiled worker bundles        |
| `.lumier/persist/` | Local dev data (KV, D1, R2)    |
| `lumier-env.d.ts`  | Generated environment types    |
