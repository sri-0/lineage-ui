"use client";

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { useLive } from "@/lib/live/store";
import { useTabs } from "@/lib/store/tabs";
import { cn } from "@/lib/utils";
import { GitBranch, Radio } from "lucide-react";
import { Brand } from "./logo";
import { ThemeToggle } from "./theme-toggle";

/** The one place for Events / Live navigation; the header toggles the rail. */
export function AppSidebar() {
  const tab = useTabs((s) => s.tab);
  const setTab = useTabs((s) => s.setTab);
  const active = useLive((s) => s.counts.queued + s.counts.running);
  const { state, toggleSidebar } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Lineage" onClick={toggleSidebar} className="p-1 group-data-[collapsible=icon]:p-1!">
              <Brand compact={state === "collapsed"} />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Events" isActive={tab === "events"} onClick={() => setTab("events")}>
                  <GitBranch />
                  <span>Events</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem className="relative">
                <SidebarMenuButton tooltip={active ? `Live · ${active} in flight` : "Live"} isActive={tab === "live"} onClick={() => setTab("live")}>
                  <Radio />
                  <span>Live</span>
                </SidebarMenuButton>
                {active > 0 && (
                  <>
                    <SidebarMenuBadge className="rounded-full bg-info/15 text-info">{active}</SidebarMenuBadge>
                    <span
                      aria-hidden
                      className={cn("pointer-events-none absolute top-1 right-1 hidden size-1.5 rounded-full bg-info group-data-[collapsible=icon]:block")}
                    />
                  </>
                )}
              </SidebarMenuItem>
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
