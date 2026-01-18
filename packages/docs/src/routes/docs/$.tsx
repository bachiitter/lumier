import { IconList } from "@tabler/icons-react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { allDocs } from "content-collections";
import { typographyVariants } from "orphos/typography";
import { CopyButton } from "~/components/copy-button";
import { RenderMarkdown } from "~/components/render-markdown";
import { SITE_TITLE } from "~/lib/constants";

export const Route = createFileRoute("/docs/$")({
  loader: async ({ params }) => {
    const page = allDocs.find((p) => p.slug === params._splat || "");

    if (!page) {
      throw notFound();
    }

    return page;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title} | ${SITE_TITLE}` },
      {
        name: "description",
        content: loaderData?.description,
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const loaderData = Route.useLoaderData();

  return (
    <>
      <article className="flex-1 min-w-0 wrap-break-word">
        <div className="mx-auto w-full max-w-2xl flex-1 space-y-10">
          <header className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-x-2">
              <h1
                className={typographyVariants({
                  variant: "heading-1",
                })}
              >
                {loaderData.title}
              </h1>
              <CopyButton value={loaderData.content} />
            </div>
            <p
              className={typographyVariants({
                variant: "paragraph",
                className: "mt-0!",
              })}
            >
              {loaderData.description}
            </p>
          </header>
          <RenderMarkdown content={loaderData?.content || ""} />
        </div>
      </article>
      <aside className="hidden xl:block w-56">
        <div className="sticky top-2 text-sm [&amp;_a]:text-muted-foreground [&amp;_a]:hover:text-primary space-y-2 [&amp;_ol]:space-y-2 [&amp;_ol_ol]:pl-3 [&amp;_ol_ol]:mt-2">
          <h2 className="font-medium flex items-center gap-1">
            <IconList className="size-4" />
            On this page
          </h2>
          <nav>
            <ol className="flex flex-col gap-2">
              {loaderData.toc
                .filter((item) => item.depth > 1)
                .map((item) => (
                  <li className="text-foreground-subtle" key={item.url}>
                    <a href={item.url}>{item.title}</a>
                  </li>
                ))}
            </ol>
          </nav>
        </div>
      </aside>
    </>
  );
}
