"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "orphos/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
import { ThemeSwitcher } from "~/components/theme-switcher";
import { META } from "~/content/docs/meta";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      sidebarWidthMobile="16rem"
      style={
        {
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <AppSidebar meta={META} />
      <SidebarInset>
        <header className="sticky inset-x-0 top-0 isolate z-20 flex shrink-0 items-center gap-2 border-b bg-background">
          <div className="flex h-(--header-height) w-full items-center justify-between gap-2 px-4">
            <SidebarTrigger />
            <ThemeSwitcher />
          </div>
        </header>
        <main className="flex flex-1 px-4 md:px-6 xl:px-10 pt-6 xl:pt-10 pb-20 w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
