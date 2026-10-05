"use client";

import { DetailPanel } from "@/components/detail/detail-panel";
import { EventsTab } from "@/components/events/events-tab";
import { LiveTab } from "@/components/live/live-tab";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarInset } from "@/components/ui/sidebar";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTabs } from "@/lib/store/tabs";
import { AppSidebar } from "./app-sidebar";
import { TopBar } from "./top-bar";

export function AppShell() {
  const tab = useTabs((s) => s.tab);
  const selected = useTabs((s) => s.selectedRunId);
  const hydrated = useHydrated();
  return (
    <>
      <AppSidebar />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        <TopBar />
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 p-1">
          <ResizablePanel id="workspace" minSize="35%" className="min-w-0">
            <div className="h-full min-h-0 overflow-hidden">{hydrated && (tab === "events" ? <EventsTab /> : <LiveTab />)}</div>
          </ResizablePanel>
          {hydrated && selected && (
            <>
              <ResizableHandle className="w-0 bg-transparent after:w-3" />
              <ResizablePanel id="detail" defaultSize="48%" minSize="30%" maxSize="70%" className="min-w-0">
                <DetailPanel runId={selected} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </SidebarInset>
    </>
  );
}
