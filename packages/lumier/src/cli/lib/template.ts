// Config Template
export const CONFIG_TEMPLATE = (name: string) => `import { $config, Worker } from "lumier";

export default $config({
  app(input) {
    return {
      name: "${name}",
      protect: ["production"],
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run(ctx) {

    const api = Worker("Api", {
      entry: "src/index.ts",
      url: true,
      bindings: {
        STAGE: ctx.stage
      }
    })

    return {
      api: api.url
    };
  },
});
`;

// Worker Template
export const WORKER_TEMPLATE = `import { env } from 'cloudflare:workers';

export default {
  async fetch(request: Request): Promise<Response> {
    return new Response(\`Hello from \${env.STAGE}!\`);
  },
};
`;
