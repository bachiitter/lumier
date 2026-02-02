"use client";

import { IconList } from "@tabler/icons-react";
import { cn } from "orphos/utils";
import { typographyVariants } from "orphos/typography";
import { useEffect, useState } from "react";
import { CopyButton } from "~/components/copy-button";
import { RenderMarkdown } from "~/components/render-markdown";

interface TocItem {
  title: string;
  url: string;
  depth: number;
}

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

export function SlugPage({ page }: { page: PageData }) {
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
        </div>
      </article>
      <aside className="hidden xl:block w-56">
        <div className="sticky top-20 text-sm space-y-2">
          <h2 className="font-medium flex items-center gap-1">
            <IconList className="size-4" />
            On this page
          </h2>
          <nav>
            <ol className="flex flex-col gap-1">
              {tocItems.map((item) => {
                const id = item.url.replace("#", "");
                const isActive = activeId === id;
                return (
                  <li key={item.url}>
                    <a
                      href={item.url}
                      className={cn(
                        "transition-colors hover:text-foreground",
                        isActive
                          ? "text-foreground font-medium"
                          : "text-foreground-subtle"
                      )}
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
