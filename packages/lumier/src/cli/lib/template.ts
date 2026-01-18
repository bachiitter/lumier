// Config Templates
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
