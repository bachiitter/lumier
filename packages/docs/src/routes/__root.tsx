import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { ThemeProvider } from "better-themes";
import { SidebarProvider } from "orphos/sidebar";
import { SITE_TITLE } from "~/lib/constants";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: SITE_TITLE,
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
          <SidebarProvider
            sidebarWidthMobile="16rem"
            style={
              {
                "--header-height": "calc(var(--spacing) * 14)",
              } as React.CSSProperties
            }
          >
            {children}
          </SidebarProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
