type MetaPage = {
  label: string;
  page: string;
  icon?: string;
};

type MetaFolder = {
  title: string;
  pages: string[];
  icon?: string;
};

type MetaLink = {
  type: "link";
  label: string;
  href: string;
  external?: boolean;
};

export type MetaItem = MetaPage | MetaFolder | MetaLink;
export type MetaConfig = Array<MetaItem>;

export const META: MetaConfig = [
  {
    label: "Introduction",
    page: "",
  },
  {
    title: "Getting Started",
    pages: ["getting-started", "config", "cli"],
  },
  {
    title: "Resources",
    pages: ["worker", "d1", "kv", "bucket", "queue", "vectorize", "durable-objects", "hyperdrive"],
  },
  {
    title: "Integrations",
    pages: ["drizzle"],
  },
] as const satisfies MetaConfig;
