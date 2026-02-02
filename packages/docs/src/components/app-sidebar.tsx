"use client";

import { IconFlame } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "orphos/sidebar";
import { type ComponentProps } from "react";
import type { MetaConfig, MetaItem } from "~/content/docs/meta";
import { SITE_TITLE } from "~/lib/constants";

interface AppSidebarProps extends ComponentProps<typeof Sidebar> {
  meta: MetaConfig;
}

function groupMetaItems(meta: MetaConfig) {
  const groups: Array<{ items: MetaItem[]; title?: string }> = [];
  let currentGroup: MetaItem[] = [];

  for (const item of meta) {
    if ("pages" in item) {
      if (currentGroup.length > 0) {
        groups.push({ items: currentGroup });
        currentGroup = [];
      }
      groups.push({ items: [item], title: item.title });
    } else {
      currentGroup.push(item);
    }
  }

  if (currentGroup.length > 0) {
    groups.push({ items: currentGroup });
  }

  return groups;
}

function NavLink({
  href,
  children,
  external,
  ...props
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (external) {
    return (
      <a href={href} rel="noreferrer" target="_blank" {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link data-active={isActive ? "true" : undefined} href={href} {...props}>
      {children}
    </Link>
  );
}

export function AppSidebar({ meta, ...props }: AppSidebarProps) {
  const groups = groupMetaItems(meta);

  return (
    <Sidebar {...props} collapsible="offcanvas" variant="sidebar">
      <SidebarHeader>
        <Link className="w-fit flex gap-2 items-center py-2 px-2" href="/docs">
          <div className="bg-primary text-primary-foreground flex aspect-square size-5 items-center justify-center rounded-md">
            <IconFlame className="size-3" />
          </div>
          <span className="font-semibold">{SITE_TITLE}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {groups.map((group, groupIndex) => (
          <SidebarGroup key={group.title ?? `group-${groupIndex}`}>
            {group.title && <SidebarGroupLabel>{group.title}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  if ("pages" in item) {
                    return item.pages.map((page) => (
                      <SidebarMenuItem key={page}>
                        <SidebarMenuButton
                          className="font-medium"
                          render={<NavLink href={`/docs/${page}`}>{formatTitle(page)}</NavLink>}
                        />
                      </SidebarMenuItem>
                    ));
                  }

                  if ("page" in item) {
                    return (
                      <SidebarMenuItem key={item.page}>
                        <SidebarMenuButton
                          className="font-medium"
                          render={<NavLink href={`/docs/${item.page}`}>{item.label}</NavLink>}
                        />
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        className="font-medium"
                        render={
                          <NavLink external={item.external} href={item.href}>
                            {item.label}
                          </NavLink>
                        }
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function formatTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
