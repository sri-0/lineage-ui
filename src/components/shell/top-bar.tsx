"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { jobsOptions } from "@/lib/api/query-options";
import { useTabs, type TabKind } from "@/lib/store/tabs";
import { useQuery } from "@tanstack/react-query";
import { GitBranch, Radio } from "lucide-react";

export function TopBar() {
  const tab = useTabs((s) => s.tab);
  const setTab = useTabs((s) => s.setTab);
  const { data } = useQuery({ ...jobsOptions({ status: "QUEUED,PENDING,RUNNING" }), refetchInterval: 10_000 });
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b bg-sidebar px-1">
      <SidebarTrigger className="size-8" />
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKind)}>
        <TabsList className="h-8">
          <TabsTrigger value="events" className="gap-1.5 text-xs">
            <GitBranch className="size-3.5" /> Events
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-1.5 text-xs">
            <Radio className="size-3.5" /> Live
            {data && data.total > 0 && <span className="rounded-full bg-info/20 px-1.5 text-[10px] text-info">{data.total}</span>}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
