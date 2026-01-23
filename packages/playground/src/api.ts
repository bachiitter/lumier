import { env } from "cloudflare:workers";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/kv") {
      await env.CACHE.put("test", "hello");
      const value = await env.CACHE.get("test");

      return new Response(`KV value: ${value}`);
    }

    if (url.pathname === "/d1") {
      const result = await env.DB.prepare("SELECT 1 as num").first<{ num: number }>();
      return new Response(`D1 result: ${result?.num}`);
    }

    if (url.pathname === "/r2") {
      await env.UPLOADS.put("test.txt", "Hello R2!");
      const obj = await env.UPLOADS.get("test.txt");
      const text = await obj?.text();
      return new Response(`R2 content: ${text}`);
    }

    return new Response(`Hello from ${env.STAGE}! Try /kv, /d1, or /r2`);
  },
};
