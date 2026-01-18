import { defineCollection, defineConfig } from "@content-collections/core";
import { getTableOfContents } from "fumadocs-core/content/toc";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import * as z from "zod";

function reactNodeToString(node: ReactNode): string {
  if (node === null || node === undefined) {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (typeof node === "boolean") {
    return "";
  }

  if (Array.isArray(node)) {
    return node.map(reactNodeToString).join("");
  }

  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>;

    if (!element.props.children) {
      return "";
    }

    return reactNodeToString(element.props.children);
  }

  return "";
}

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
    const parts = document._meta.path.split("/");
    const isIndex = parts[parts.length - 1] === "index";
    const slug = isIndex ? parts.slice(0, -1).join("/") : document._meta.fileName.replace(/\.md$/, "");

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
