"use client";

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarTrigger,
} from "@/components/ui/sidebar";
import { useDashboard } from "@/lib/dashboard/store";
import { GitBranch, Radio } from "lucide-react";
import Link from "next/link";
import type { View } from "./app-shell";
import { Brand } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const NAV: { view: View; href: string; label: string; tooltip: string; icon: typeof Radio }[] = [
  { view: "lineage", href: "/lineage", label: "Lineage", tooltip: "Lineage", icon: GitBranch },
  { view: "events", href: "/events", label: "Events", tooltip: "Events dashboard", icon: Radio },
];

/** The one place for navigation: Lineage (everything indexed, the landing page) and Events (the dashboard). */
export function AppSidebar({ view }: { view: View }) {
  const active = useDashboard((s) => s.counts.queued + s.counts.running);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center px-2">
        <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Brand />
          <SidebarTrigger className="ml-auto size-7 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton asChild tooltip={item.view === "events" && active ? `${item.tooltip} · ${active} in flight` : item.tooltip} isActive={view === item.view}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.view === "events" && active > 0 && (
                    <>
                      <SidebarMenuBadge className="h-5 min-w-5 rounded-full bg-info/15 px-1.5 text-[10px] font-medium text-info">{active}</SidebarMenuBadge>
                      <span aria-hidden className="pointer-events-none absolute top-1 right-1 hidden size-1.5 rounded-full bg-info group-data-[collapsible=icon]:block" />
                    </>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
