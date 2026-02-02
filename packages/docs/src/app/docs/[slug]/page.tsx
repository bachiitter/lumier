import { notFound } from "next/navigation";
import { allDocs } from "content-collections";
import { SlugPage } from "./slug-page";

interface PageProps {
  params: Promise<{ slug: string }>;
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

  return <SlugPage page={page} />;
}
