import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarTrigger } from "orphos/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
import { ThemeSwitcher } from "~/components/theme-switcher";
import { META } from "~/content/docs/meta";

export const Route = createFileRoute("/docs")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <AppSidebar meta={META} />
      <SidebarInset>
        <header className="sticky inset-x-0 top-0 isolate z-10 flex shrink-0 items-center gap-2 border-b bg-background">
          <div className="flex h-(--header-height) w-full items-center justify-between gap-2 px-4">
            <SidebarTrigger />
            <ThemeSwitcher />
          </div>
        </header>
        <main className="flex flex-1 overflow-auto p-4 md:p-6 xl:p-10 w-full">
          <Outlet />
        </main>
      </SidebarInset>
    </>
  );
}
