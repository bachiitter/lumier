"use client";

import { IconList } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "orphos/button";
import { typographyVariants } from "orphos/typography";
import { cn } from "orphos/utils";
import { useEffect, useState } from "react";
import { CopyButton } from "~/components/copy-button";
import { RenderMarkdown } from "~/components/render-markdown";

interface TocItem {
  title: string;
  url: string;
  depth: number;
}

type PageNav = {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
};

interface PageData {
  title: string;
  description: string;
  content: string;
  toc: TocItem[];
}

function useActiveHeading(headingIds: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (headingIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px", threshold: 0 }
    );

    for (const id of headingIds) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [headingIds]);

  return activeId;
}

export function SlugPage({ page, nav }: { page: PageData; nav: PageNav }) {
  const tocItems = page.toc.filter((item) => item.depth > 1);
  const headingIds = tocItems.map((item) => item.url.replace("#", ""));
  const activeId = useActiveHeading(headingIds);

  return (
    <>
      <article className="flex-1 min-w-0 wrap-break-word">
        <div className="mx-auto w-full max-w-3xl flex-1 space-y-10">
          <header className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-x-2">
              <h1
                className={typographyVariants({
                  variant: "heading-1",
                })}
              >
                {page.title}
              </h1>
              <CopyButton value={page.content} />
            </div>
            <p
              className={typographyVariants({
                variant: "paragraph",
                className: "mt-0!",
              })}
            >
              {page.description}
            </p>
          </header>
          <RenderMarkdown content={page.content} />

          {(nav.prev || nav.next) && (
            <nav className="mt-16 border-t border-border-subtle pt-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                {nav.prev ? (
                  <Button
                    variant="default"
                    size="lg"
                    render={<Link href={`/docs/${nav.prev.slug}`} />}
                    className={cn(
                      "h-auto w-full items-start justify-start whitespace-normal border-border-subtle bg-background-subtle py-4",
                      "sm:max-w-[48%]"
                    )}
                  >
                    <span className="flex flex-col gap-2 text-left">
                      <span className="text-xs font-semibold uppercase tracking-[0.38em] text-foreground-subtle">
                        Previous
                      </span>
                      <span className="text-sm font-semibold text-foreground">{nav.prev.title}</span>
                    </span>
                  </Button>
                ) : null}

                {nav.next ? (
                  <Button
                    variant="default"
                    size="lg"
                    render={<Link href={`/docs/${nav.next.slug}`} />}
                    className={cn(
                      "h-auto w-full items-start justify-end whitespace-normal border-border-subtle bg-background-subtle py-4",
                      "sm:max-w-[48%] sm:ml-auto"
                    )}
                  >
                    <span className="flex flex-col gap-2 text-right">
                      <span className="text-xs font-semibold uppercase tracking-[0.38em] text-foreground-subtle">
                        Next
                      </span>
                      <span className="text-sm font-semibold text-foreground">{nav.next.title}</span>
                    </span>
                  </Button>
                ) : null}
              </div>
            </nav>
          )}
        </div>
      </article>
      <aside className="hidden xl:block w-56">
        <div className="fixed top-28 text-sm space-y-2">
          <h2 className="font-medium flex items-center gap-1">
            <IconList className="size-4" />
            On this page
          </h2>
          <nav aria-label="Table of contents">
            <ol className="flex flex-col gap-1">
              {tocItems.map((item) => {
                const id = item.url.replace("#", "");
                const isActive = activeId === id;
                const indent = Math.max(0, item.depth - 2);

                return (
                  <li key={item.url} style={{ paddingLeft: `${indent * 12}px` }}>
                    <a
                      href={item.url}
                      className={cn(
                        "transition-colors hover:text-foreground",
                        isActive ? "text-foreground font-medium" : "text-foreground-subtle"
                      )}
                      aria-current={isActive ? "true" : undefined}
                    >
                      {item.title}
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </aside>
    </>
  );
}
