---
title: Bucket (R2)
description: Cloudflare R2 object storage
---

R2 is S3-compatible object storage with zero egress fees.

## Basic Usage

```ts
import { $config, Worker, Bucket } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const uploads = Bucket("uploads");

    Worker("api", {
      entry: "src/index.ts",
      bindings: {
        UPLOADS: uploads,
      },
    });
  },
});
```

## Options

```ts
Bucket("uploads", {
  location: "wnam",              // Location hint
  jurisdiction: "eu",            // GDPR compliance
  storageClass: "Standard",      // Storage class
});
```

| Option         | Type                            | Description                    |
| -------------- | ------------------------------- | ------------------------------ |
| `location`     | `string`                        | Location hint for placement    |
| `jurisdiction` | `"eu"` \| `"fedramp"`           | Jurisdictional restriction     |
| `storageClass` | `"Standard"` \| `"InfrequentAccess"` | Default storage class    |

### Location Hints

| Value  | Region                 |
| ------ | ---------------------- |
| `apac` | Asia Pacific           |
| `eeur` | Eastern Europe         |
| `enam` | Eastern North America  |
| `weur` | Western Europe         |
| `wnam` | Western North America  |

## Using Existing Bucket

Reference an R2 bucket not managed by Lumier:

```ts
const uploads = Bucket.existing("uploads", {
  bucketName: "my-existing-bucket",
});
```

## Worker Code

```ts
// src/index.ts
import { env } from "cloudflare:workers";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    // Upload
    if (request.method === "PUT") {
      await env.UPLOADS.put(key, request.body, {
        httpMetadata: {
          contentType: request.headers.get("content-type") || "application/octet-stream",
        },
      });
      return new Response("Uploaded");
    }

    // Download
    if (request.method === "GET") {
      const object = await env.UPLOADS.get(key);
      if (!object) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(object.body, {
        headers: {
          "content-type": object.httpMetadata?.contentType || "application/octet-stream",
        },
      });
    }

    // Delete
    if (request.method === "DELETE") {
      await env.UPLOADS.delete(key);
      return new Response("Deleted");
    }

    // List
    const { objects } = await env.UPLOADS.list({ prefix: "images/" });
    return Response.json(objects.map(o => o.key));
  },
};
```

## Multipart Uploads

For large files, use multipart uploads:

```ts
const upload = await env.UPLOADS.createMultipartUpload("large-file.zip");

const part1 = await upload.uploadPart(1, chunk1);
const part2 = await upload.uploadPart(2, chunk2);

await upload.complete([part1, part2]);
```

## Output

```ts
interface BucketOutput {
  type: "bucket";
  name: string;
}
```
