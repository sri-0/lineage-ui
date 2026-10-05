"use client";

import { DetailPanel } from "@/components/detail/detail-panel";
import { EventsTab } from "@/components/events/events-tab";
import { LiveTab } from "@/components/live/live-tab";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarInset } from "@/components/ui/sidebar";
import { useHydrated } from "@/hooks/use-hydrated";
import { connectLive } from "@/lib/live/store";
import { useTabs } from "@/lib/store/tabs";
import * as React from "react";
import { AppSidebar } from "./app-sidebar";

export function AppShell() {
  const tab = useTabs((s) => s.tab);
  const selected = useTabs((s) => s.selectedRunId);
  const position = useTabs((s) => s.detailPosition);
  const hydrated = useHydrated();
  // One socket for the whole app: the Live tab and the sidebar badge both read it.
  React.useEffect(() => connectLive(), []);
  const vertical = position === "bottom";
  return (
    <>
      <AppSidebar />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        {/* Keyed by position so the panel group remounts with the new orientation. */}
        <ResizablePanelGroup key={position} orientation={vertical ? "vertical" : "horizontal"} className="min-h-0 flex-1 p-1">
          <ResizablePanel id="workspace" minSize="30%" className="min-h-0 min-w-0">
            <div className="h-full min-h-0 overflow-hidden">{hydrated && (tab === "events" ? <EventsTab /> : <LiveTab />)}</div>
          </ResizablePanel>
          {hydrated && selected && (
            <>
              <ResizableHandle className={vertical ? "bg-transparent aria-[orientation=horizontal]:after:h-3" : "w-0 bg-transparent after:w-3"} />
              <ResizablePanel id="detail" defaultSize={vertical ? "50%" : "48%"} minSize="25%" maxSize="75%" className="min-h-0 min-w-0">
                <DetailPanel runId={selected} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </SidebarInset>
    </>
  );
}
