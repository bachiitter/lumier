---
title: Vectorize
description: Cloudflare Vectorize vector database
---

Vectorize is a vector database for AI embeddings and similarity search.

## Basic Usage

```ts
import { $config, Worker, Vectorize } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const embeddings = Vectorize("embeddings", {
      dimensions: 1536,
      metric: "cosine",
    });

    Worker("api", {
      entry: "src/index.ts",
      bindings: {
        EMBEDDINGS: embeddings,
        AI: { type: "ai" },
      },
    });
  },
});
```

## Options

```ts
Vectorize("embeddings", {
  dimensions: 1536,        // Vector dimensions (required)
  metric: "cosine",        // Distance metric
});
```

| Option       | Type     | Default    | Description                    |
| ------------ | -------- | ---------- | ------------------------------ |
| `dimensions` | `number` | —          | Vector dimensions (required)   |
| `metric`     | `string` | `"cosine"` | Distance metric                |

### Distance Metrics

| Metric        | Description                              |
| ------------- | ---------------------------------------- |
| `cosine`      | Cosine similarity (recommended for text) |
| `euclidean`   | Euclidean distance                       |
| `dot-product` | Dot product similarity                   |

## Using Existing Index

```ts
const embeddings = Vectorize.existing("embeddings", {
  indexName: "my-existing-index",
});
```

## Worker Code

```ts
// src/index.ts
import { env } from "cloudflare:workers";

export default {
  async fetch(request: Request): Promise<Response> {
    const { query } = await request.json();

    // Generate embedding using Workers AI
    const embedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: query,
    });

    // Search similar vectors
    const results = await env.EMBEDDINGS.query(embedding.data[0], {
      topK: 10,
      returnMetadata: true,
    });

    return Response.json(results);
  },
};
```

## Inserting Vectors

```ts
// Insert vectors with metadata
await env.EMBEDDINGS.upsert([
  {
    id: "doc-1",
    values: embedding1,
    metadata: { title: "Document 1", category: "tech" },
  },
  {
    id: "doc-2",
    values: embedding2,
    metadata: { title: "Document 2", category: "science" },
  },
]);
```

## Querying

```ts
// Basic query
const results = await env.EMBEDDINGS.query(vector, {
  topK: 10,
});

// With metadata filter
const results = await env.EMBEDDINGS.query(vector, {
  topK: 10,
  filter: { category: "tech" },
  returnMetadata: true,
  returnValues: false,
});
```

## Deleting Vectors

```ts
// Delete by IDs
await env.EMBEDDINGS.deleteByIds(["doc-1", "doc-2"]);
```

## Output

```ts
interface VectorizeOutput {
  type: "vectorize";
  name: string;
}
```
