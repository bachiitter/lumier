"use client";

import { createCodePlugin } from "@streamdown/code";
import { mermaid } from "@streamdown/mermaid";
import { Kbd, KbdGroup } from "orphos/kbd";
import { typographyVariants } from "orphos/typography";
import { cn } from "orphos/utils";
import rehypeSlug from "rehype-slug";
import { Streamdown } from "streamdown";

const code = createCodePlugin({
  themes: ["vitesse-light", "vitesse-dark"], // [light, dark]
});

export function RenderMarkdown({ content }: { content: string }) {
  return (
    <Streamdown
      className="mx-auto w-full flex-1 space-y-0"
      components={{
        h1: ({ className, node, style, ...props }) => (
          <h1
            className={cn(
              typographyVariants({
                variant: "heading-1",
              }),
              "first:mt-0 [&_span.text-gray-500]:hidden",
              className
            )}
            {...props}
          />
        ),
        h2: ({ className, node, style, ...props }) => (
          <h2
            className={cn(
              typographyVariants({
                variant: "heading-2",
              }),
              "first:mt-0 [&_span.text-gray-500]:hidden",
              className
            )}
            {...props}
          />
        ),
        h3: ({ className, node, ...props }) => (
          <h3
            className={cn(
              typographyVariants({
                variant: "heading-3",
              }),
              "first:mt-0 [&_span.text-gray-500]:hidden",
              className
            )}
            {...props}
          />
        ),
        h4: ({ className, node, ...props }) => (
          <h4
            className={cn(
              typographyVariants({
                variant: "heading-4",
              }),
              "first:mt-0 [&_span.text-gray-500]:hidden",
              className
            )}
            {...props}
          />
        ),
        p: ({ className, node, ...props }) => (
          <p
            className={cn(
              typographyVariants({
                variant: "paragraph",
              }),
              "wrap-break-word first:mt-0",
              className
            )}
            {...props}
          />
        ),
        strong: ({ className, node, ...props }) => (
          <strong
            className={cn(
              typographyVariants({
                variant: "strong",
              }),
              "first:mt-0",
              className
            )}
            {...props}
          />
        ),
        blockquote: ({ className, node, ...props }) => (
          <blockquote
            className={cn(
              typographyVariants({
                variant: "blockquote",
              }),
              "first:mt-0",
              className
            )}
            {...props}
          />
        ),
        ul: ({ className, node, ...props }) => (
          <ul
            className={cn(
              typographyVariants({
                variant: "ul",
              }),
              "first:mt-0",
              className
            )}
            {...props}
          />
        ),
        ol: ({ className, node, ...props }) => (
          <ol
            className={cn(
              typographyVariants({
                variant: "ol",
              }),
              "first:mt-0",
              className
            )}
            {...props}
          />
        ),
        li: ({ node, ...props }) => <li className="scroll-m-20" {...props} />,
        kbd: ({ children, node, ...props }) => (
          <KbdGroup>
            <Kbd {...props}>{children}</Kbd>
          </KbdGroup>
        ),
        a: ({ className, node, ...props }) => {
          return (
            <a
              {...props}
              className={cn(
                typographyVariants({
                  variant: "link",
                }),
                className
              )}
            />
          );
        },
        img: ({ className, node, ...props }) => {
          return <img {...props} />;
        },
        iframe: ({ className, node, ...props }) => {
          return (
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className={cn("aspect-video w-full", className)}
              loading="lazy"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-popups"
              {...props}
            />
          );
        },
        hr: ({ className, node, ...props }) => <hr className={cn("my-4 md:my-8", className)} {...props} />,
        table: ({ className, node, ...props }) => (
          <div className="mt-6 w-full overflow-y-auto">
            <table className={cn("relative w-full overflow-hidden text-base", className)} {...props} />
          </div>
        ),
        tr: ({ className, node, ...props }) => (
          <tr className={cn("m-0 border-b last:border-b-none even:bg-background-subtle", className)} {...props} />
        ),
        th: ({ className, node, ...props }) => (
          <th
            className={cn(
              "border border-border-subtle bg-background-element px-4 py-2 text-left font-semibold [[align=center]]:text-center [[align=right]]:text-right",
              className
            )}
            {...props}
          />
        ),
        td: ({ className, node, ...props }) => (
          <td
            className={cn(
              "border border-border-subtle px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right",
              className
            )}
            {...props}
          />
        ),
        figure: ({ className, node, ...props }) => <figure className={cn(className)} {...props} />,
        figcaption: ({ className, node, ...props }) => (
          <figcaption
            className={cn(
              "flex items-center gap-2 text-foreground-subtle [&_svg]:size-4 [&_svg]:text-foreground-subtle [&_svg]:opacity-70",
              className
            )}
            {...props}
          />
        ),
      }}
      controls={{
        table: false,
      }}
      mode="static"
      plugins={{ code, mermaid }}
      rehypePlugins={[rehypeSlug]}
      remarkRehypeOptions={{
        footnoteLabel: "Footnotes",
        footnoteBackLabel: "Back to content",
        footnoteBackContent: "↩",
      }}
    >
      {content}
    </Streamdown>
  );
}
