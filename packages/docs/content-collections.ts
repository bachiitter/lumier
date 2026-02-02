import { defineCollection, defineConfig } from "@content-collections/core";
import { getTableOfContents } from "fumadocs-core/content/toc";
import * as z from "zod";
import { reactNodeToString } from "./src/lib/react-node-to-string";

const docs = defineCollection({
  name: "docs",
  directory: "./src/content/docs",
  include: "**/*.md",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    content: z.string(),
  }),
  transform: async ({ content, ...document }) => {
    const slug = document._meta.fileName.replace(/\.md$/, "");

    const toc = getTableOfContents(content).map((item) => ({ ...item, title: reactNodeToString(item.title) }));

    return {
      title: document.title,
      description: document.description,
      slug,
      content,
      toc,
    };
  },
});

export default defineConfig({
  collections: [docs],
});
