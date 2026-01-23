import { $config, Bucket, D1, KV, Worker } from "lumier";

export default $config({
  app() {
    return {
      name: "playground",
      protect: ["production"],
    };
  },
  run(ctx) {
    const cache = KV("Cache");
    const uploads = Bucket("UPLOADS");
    const db = D1("DATABASE");

    const api = Worker("Api", {
      entry: "src/index.ts",
      url: true,
      bindings: {
        STAGE: ctx.stage,
        UPLOADS: uploads,
        CACHE: cache,
        DB: db,
      },
    });

    return {
      api: api.url,
    };
  },
});

