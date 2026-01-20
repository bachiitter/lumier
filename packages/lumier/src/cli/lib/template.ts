// Config Template
export const CONFIG_TEMPLATE = (name: string) => `import { $config, Worker } from "lumier";

export default $config({
  app() {
    return {
      name: "${name}",
      protect: ["production"],
    };
  },
  async run(ctx) {
    return {};
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
