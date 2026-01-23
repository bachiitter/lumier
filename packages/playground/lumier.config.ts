import { $config, Bucket, D1, KV, Worker } from "lumier";

export default $config({
  app(input) {
    return {
      name: "playground",
      protect: ["production"],
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  run(ctx) {
    const cache = KV("Cache");
    const uploads = Bucket("UPLOADS");
    const db = D1("DATABASE");

    const api = Worker("Api", {
      entry: "src/api.ts",
      url: true,
      bindings: {
        STAGE: ctx.stage,
        UPLOADS: uploads,
        CACHE: cache,
        DB: db,
      },
    });

    // const auth = Worker("Auth", {
    //   entry: "src/auth.ts",
    //   url: true,
    //   bindings: {
    //     STAGE: ctx.stage,
    //   },
    // });

    return {
      api: api.url,
      // auth: auth.url,
    };
  },
});
