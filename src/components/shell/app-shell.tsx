"use client";

import { EventsDashboard } from "@/components/dashboard/events-dashboard";
import { DetailPanel } from "@/components/detail/detail-panel";
import { LineageView } from "@/components/events/lineage-view";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarInset } from "@/components/ui/sidebar";
import { useHydrated } from "@/hooks/use-hydrated";
import { connectDashboard } from "@/lib/dashboard/store";
import { useTabs } from "@/lib/store/tabs";
import * as React from "react";
import { AppSidebar } from "./app-sidebar";

export type View = "events" | "lineage";

export function AppShell({ view }: { view: View }) {
  const selected = useTabs((s) => s.selectedRunId);
  const position = useTabs((s) => s.detailPosition);
  const hydrated = useHydrated();
  // One socket for the whole app: the dashboard and the sidebar badge both read it.
  React.useEffect(() => connectDashboard(), []);
  const vertical = position === "bottom";
  return (
    <>
      <AppSidebar view={view} />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        {/* Keyed by position so the panel group remounts with the new orientation. */}
        <ResizablePanelGroup key={position} orientation={vertical ? "vertical" : "horizontal"} className="min-h-0 flex-1 p-1">
          <ResizablePanel id="workspace" minSize="30%" className="min-h-0 min-w-0">
            <div className="h-full min-h-0 overflow-hidden">{hydrated && (view === "events" ? <EventsDashboard /> : <LineageView />)}</div>
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
