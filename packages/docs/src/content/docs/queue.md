---
title: Queue
description: Cloudflare Queues for async message processing
---

Queues enable reliable, asynchronous message processing. Use them to move work out of request/response paths: emails, webhooks, background jobs, and fanout pipelines.

A queue setup usually has:

- A **producer** Worker that sends messages
- A **consumer** Worker that processes batches of messages

## Basic Usage

```ts
import { $config, Worker, Queue } from "lumier";

export default $config({
  app() {
    return { name: "my-app", protect: ["production"] };
  },
  run() {
    const api = Worker("api", {
      entry: "src/api.ts",
    });

    const jobs = Queue("jobs", {
      consumer: {
        worker: api,
        settings: {
          batchSize: 10,
          batchTimeout: 5,
        },
      },
    });

    // Bind queue to producer
    Worker("producer", {
      entry: "src/producer.ts",
      bindings: {
        JOBS: jobs,
      },
    });
  },
});
```

## Producer vs Consumer

- Producers call `send`/`sendBatch`.
- Consumers implement a `queue(batch)` handler and must `ack()` or `retry()` messages.

## Options

```ts
Queue("jobs", {
  consumer: {
    worker: api,
    settings: {
      batchSize: 10,        // Max messages per batch
      batchTimeout: 5,      // Max seconds to wait for batch
      maxRetries: 3,        // Retry attempts
      maxConcurrency: 10,   // Concurrent consumers
      retryDelay: 60,       // Seconds between retries
    },
  },
  deadLetterQueue: dlq,     // Failed message destination
});
```

| Option            | Type                | Description                    |
| ----------------- | ------------------- | ------------------------------ |
| `consumer`        | `object`            | Consumer configuration         |
| `deadLetterQueue` | `QueueOutput`       | Queue for failed messages      |

### Consumer Settings

| Setting          | Type     | Default | Description                    |
| ---------------- | -------- | ------- | ------------------------------ |
| `batchSize`      | `number` | 10      | Max messages per batch         |
| `batchTimeout`   | `number` | 5       | Seconds to wait for full batch |
| `maxRetries`     | `number` | 3       | Retry attempts before DLQ      |
| `maxConcurrency` | `number` | —       | Concurrent consumer instances  |
| `retryDelay`     | `number` | —       | Seconds between retries        |

## Using Existing Queue

```ts
const jobs = Queue.existing("jobs", {
  queueName: "my-existing-queue",
});
```

## Producer Code

```ts
// src/producer.ts
import { env } from "cloudflare:workers";

export default {
  async fetch(request: Request): Promise<Response> {
    // Send single message
    await env.JOBS.send({
      type: "email",
      to: "user@example.com",
      subject: "Hello",
    });

    // Send batch
    await env.JOBS.sendBatch([
      { body: { task: "process", id: 1 } },
      { body: { task: "process", id: 2 } },
    ]);

    return new Response("Queued");
  },
};
```

## Consumer Code

```ts
// src/api.ts
import { env } from "cloudflare:workers";

interface Job {
  type: string;
  to?: string;
  subject?: string;
}

export default {
  async queue(batch: MessageBatch<Job>): Promise<void> {
    for (const message of batch.messages) {
      try {
        console.log("Processing:", message.body);
        
        // Process message...
        
        message.ack();  // Acknowledge success
      } catch (error) {
        message.retry(); // Retry later
      }
    }
  },

  async fetch(request: Request): Promise<Response> {
    return new Response("Consumer worker");
  },
};
```

## Operational Notes

- Make consumers idempotent: retries can deliver the same message more than once.
- Prefer small payloads; store large data in R2 and send a pointer (key/id) through the queue.
- Use a dead-letter queue for messages that repeatedly fail.

## Output

```ts
interface QueueOutput {
  type: "queue";
  name: string;
}
```

## Next Steps

- [Worker](/docs/worker) — Binding queues to Workers
- [Bucket (R2)](/docs/bucket) — Large payloads and attachments
