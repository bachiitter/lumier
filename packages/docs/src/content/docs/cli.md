---
title: CLI
description: Lumier command-line interface
---

Lumier’s CLI is designed to be small and stage-aware. Most commands accept `--stage`, letting you target isolated environments (for example: `dev`, `staging`, `production`) without duplicating config files.

## Global Flags

| Flag | Description |
| --- | --- |
| `--stage <name>` | Target stage (default: your OS username) |
| `--verbose` | Verbose logs |

## Environment Variables

Commands that interact with Cloudflare require:

| Variable | Description |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | API token for Cloudflare’s API |

## Commands

### `init`

Initialize a new Lumier project:

```bash
bunx lumier init
```

Creates `lumier.config.ts`, `.lumier/` directory, and `src/index.ts`.

### `dev`

Run a development stage:

```bash
bunx lumier dev
```

Typical usage:

```bash
bunx lumier dev --stage dev
```

Options:

| Flag              | Description                          |
| ----------------- | ------------------------------------ |
| `--stage <name>`  | Stage name (default: OS username)    |
| `--verbose`       | Enable verbose logging               |

The dev command is meant to keep your iteration loop tight while staying stage-aware. In practice, you’ll typically run a `dev` stage, then deploy to `production` when ready.

### `deploy`

Build and deploy to Cloudflare:

```bash
bunx lumier deploy
```

Options:

| Flag              | Description                          |
| ----------------- | ------------------------------------ |
| `--stage <name>`  | Stage to deploy (default: OS username) |
| `--preview`       | Preview changes without deploying    |

Example:

```bash
bunx lumier deploy --stage production --preview
bunx lumier deploy --stage production
```

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

Secrets are stage-scoped. Set the stage with `--stage` when needed:

```bash
bunx lumier secret set API_KEY --stage production
```

### `version`

Show the Lumier version:

```bash
bunx lumier version
```

## Project Files

| Path               | Description                    |
| ------------------ | ------------------------------ |
| `lumier.config.ts` | Infrastructure configuration   |
| `.lumier/`         | Local state directory          |
| `.lumier/build/`   | Compiled worker bundles        |
| `lumier-env.d.ts`  | Generated environment types    |
