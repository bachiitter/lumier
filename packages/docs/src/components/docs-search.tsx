"use client";

import { IconSearch } from "@tabler/icons-react";
import { allDocs } from "content-collections";
import { Dialog, DialogContent } from "orphos/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "orphos/input-group";
import { Kbd, KbdGroup } from "orphos/kbd";
import { Button } from "orphos/button";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "orphos/sidebar";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { META } from "~/content/docs/meta";

type SearchResult = {
  slug: string;
  title: string;
  description: string;
  score: number;
};

function getDocOrder(): string[] {
  return META.flatMap((item) => {
    if ("pages" in item) return item.pages;
    if ("page" in item) return [item.page];
    return [];
  });
}

function normalizeQuery(value: string): string[] {
  return value
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function scoreDoc(doc: (typeof allDocs)[number], terms: string[]): number {
  const title = doc.title.toLowerCase();
  const description = doc.description.toLowerCase();
  const slug = doc.slug.toLowerCase();
  const headings = doc.toc.map((item) => item.title).join(" ").toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 80;
    if (slug.includes(term)) score += 60;
    if (description.includes(term)) score += 35;
    if (headings.includes(term)) score += 25;
    // Small bump for occurrences in content, but keep it weak to avoid bundling
    // a "search engine" feel when people mostly expect title-level matches.
    if (doc.content.toLowerCase().includes(term)) score += 5;
  }

  return score;
}

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

export function DocsSearch() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [modifierKey, setModifierKey] = React.useState("⌘");

  React.useEffect(() => {
    // Close search on navigation so it never feels "stuck".
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (typeof navigator === "undefined") return;
    const platform = navigator.platform?.toLowerCase() ?? "";
    setModifierKey(platform.includes("mac") ? "⌘" : "Ctrl");
  }, []);

  React.useEffect(() => {
    if (!open) return;

    // Let the dialog mount first, then focus the input.
    const id = window.setTimeout(() => document.getElementById("docs-search-input")?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  React.useEffect(() => {
    if (open) return;
    setQuery("");
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
  }, [open, query]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const key = event.key.toLowerCase();
      const isCommandK = key === "k" && (event.metaKey || event.ctrlKey);
      const isSlash = key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;

      if (!open && (isCommandK || (isSlash && !isTypingInField(event.target)))) {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const results = React.useMemo((): SearchResult[] => {
    const terms = normalizeQuery(query);

    const order = getDocOrder();
    const inOrder = new Set(order);

    if (terms.length === 0) {
      const ordered = order
        .map((slug) => allDocs.find((doc) => doc.slug === slug))
        .filter((doc): doc is (typeof allDocs)[number] => Boolean(doc));

      const extras = allDocs
        .filter((doc) => !inOrder.has(doc.slug))
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title));

      return [...ordered, ...extras].slice(0, 8).map((doc) => ({
        slug: doc.slug,
        title: doc.title,
        description: doc.description,
        score: 0,
      }));
    }

    const scored = allDocs
      .map((doc) => ({
        slug: doc.slug,
        title: doc.title,
        description: doc.description,
        score: scoreDoc(doc, terms),
      }))
      .filter((doc) => doc.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    return scored.slice(0, 12);
  }, [query]);

  const openResult = React.useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery("");
      router.push(`/docs/${result.slug}`);
    },
    [router]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="default"
        size="md"
        className="hidden md:flex min-w-[18rem] justify-between"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <IconSearch className="size-4 text-foreground-subtle" />
          Search docs
        </span>
        <KbdGroup>
          <Kbd>{modifierKey}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <Button type="button" variant="default" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
        <IconSearch className="size-4" />
        <span className="sr-only">Search docs</span>
      </Button>

      <DialogContent>
        <div className="grid gap-4">
          <InputGroup>
            <InputGroupAddon>
              <IconSearch className="size-4 text-foreground-subtle" />
            </InputGroupAddon>
            <InputGroupInput
              id="docs-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs…"
              onKeyDown={(e) => {
                if (results.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((idx) => Math.min(idx + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((idx) => Math.max(idx - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const chosen = results[activeIndex];
                  if (chosen) openResult(chosen);
                }
              }}
            />
            <InputGroupAddon align="inline-end">
              <Kbd>Esc</Kbd>
            </InputGroupAddon>
          </InputGroup>

          {results.length === 0 ? (
            <p className="px-1 text-sm text-foreground-subtle">No results.</p>
          ) : (
            <SidebarMenu role="listbox" aria-label="Search results" className="max-h-[60vh] overflow-y-auto">
              {results.map((result, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <SidebarMenuItem key={result.slug} role="option" aria-selected={isActive}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className="h-auto items-start py-3 whitespace-normal"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => openResult(result)}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-foreground">{result.title}</span>
                        <span className="text-sm text-foreground-subtle">{result.description}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
