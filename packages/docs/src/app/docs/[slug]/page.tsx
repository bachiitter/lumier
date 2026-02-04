import { notFound } from "next/navigation";
import { allDocs } from "content-collections";
import { META } from "~/content/docs/meta";
import { SlugPage } from "./slug-page";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function getDocOrder(): string[] {
  const base = META.flatMap((item) => {
    if ("pages" in item) return item.pages;
    if ("page" in item) return [item.page];
    return [];
  });

  const inBase = new Set(base);
  const extras = allDocs
    .map((doc) => doc.slug)
    .filter((slug) => !inBase.has(slug))
    .sort();

  return [...base, ...extras];
}

export async function generateStaticParams() {
  return allDocs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const page = allDocs.find((p) => p.slug === slug);

  if (!page) {
    return {};
  }

  return {
    title: page.title,
    description: page.description,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = allDocs.find((p) => p.slug === slug);

  if (!page) {
    notFound();
  }

  const order = getDocOrder();
  const index = order.indexOf(slug);

  const prevSlug = index > 0 ? order[index - 1] : null;
  const nextSlug = index >= 0 && index < order.length - 1 ? order[index + 1] : null;

  const prevDoc = prevSlug ? allDocs.find((doc) => doc.slug === prevSlug) : null;
  const nextDoc = nextSlug ? allDocs.find((doc) => doc.slug === nextSlug) : null;

  return (
    <SlugPage
      page={page}
      nav={{
        prev: prevDoc ? { slug: prevDoc.slug, title: prevDoc.title } : null,
        next: nextDoc ? { slug: nextDoc.slug, title: nextDoc.title } : null,
      }}
    />
  );
}
