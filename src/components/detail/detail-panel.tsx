"use client";

import { RunStatusPill } from "@/components/events/status-pill";
import { Panel, PanelBody, PanelHeader } from "@/components/shell/panel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { eventOptions, schemaOptions } from "@/lib/api/query-options";
import { at, str } from "@/lib/schema/fields";
import { formatDuration } from "@/lib/status";
import { useTabs, type DetailTab } from "@/lib/store/tabs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity, GitBranch, Info, Link2, ScrollText } from "lucide-react";
import { LineageTab } from "./lineage-tab";
import { LogsTab } from "./logs-tab";
import { MetadataTab } from "./metadata-tab";
import { RelatedTab } from "./related-tab";
import { TraceTab } from "./trace-tab";

const TABS: { value: DetailTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "lineage", label: "Lineage", icon: GitBranch },
  { value: "trace", label: "Trace", icon: Activity },
  { value: "logs", label: "Logs", icon: ScrollText },
  { value: "metadata", label: "Metadata", icon: Info },
  { value: "related", label: "Related", icon: Link2 },
];

/** Right-hand detail for the selected top-level run. */
export function DetailPanel({ runId }: { runId: string }) {
  const close = useTabs((s) => s.close);
  const tab = useTabs((s) => s.detailTab);
  const setTab = useTabs((s) => s.setDetailTab);
  const { data, isLoading } = useQuery({ ...eventOptions(runId), refetchInterval: (q) => (q.state.data?.state.status === "RUNNING" ? 5000 : false) });
  const paths = useQuery(schemaOptions()).data?.paths ?? {};
  const start = (data?.start ?? {}) as Record<string, unknown>;
  const id = (name: string) => str(at(start, paths[name]));
  const promoted = { filename: id("filename"), project: id("project"), controlset_id: id("controlset"), mimetype: id("mimetype"), refeed_seq: Number(id("refeedSeq")) || 0, root_id: id("rootId") };

  return (
    <Panel>
      <PanelHeader
        title={
          isLoading ? (
            <Skeleton className="h-4 w-48" />
          ) : (
            <span className="flex items-center gap-2">
              <span className="truncate font-mono text-xs">{promoted.filename || runId}</span>
              {data && <RunStatusPill status={data.state.status} />}
            </span>
          )
        }
        onClose={close}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 text-[11px] text-muted-foreground">
        {promoted.project && <Badge variant="secondary" className="font-mono">{promoted.project}</Badge>}
        {promoted.controlset_id && <Badge variant="outline" className="font-mono">{promoted.controlset_id}</Badge>}
        {promoted.mimetype && <span>{promoted.mimetype}</span>}
        {data && <span>started {format(new Date(data.state.startedAt), "d MMM HH:mm:ss")}</span>}
        {data?.state.durationMs !== undefined && <span className="font-mono">{formatDuration(data.state.durationMs)}</span>}
        {promoted.refeed_seq ? <Badge variant="outline">refeed #{promoted.refeed_seq}</Badge> : null}
        <span className="ml-auto font-mono" title="root_id">{promoted.root_id.slice(0, 8)}</span>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as DetailTab)} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-2 w-fit">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs">
              <t.icon className="size-3.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <PanelBody className="relative mt-2 overflow-hidden">
          {tab === "lineage" && <LineageTab runId={runId} />}
          {tab === "trace" && <TraceTab runId={runId} />}
          {tab === "logs" && <LogsTab runId={runId} />}
          {tab === "metadata" && <MetadataTab runId={runId} />}
          {tab === "related" && <RelatedTab runId={runId} />}
        </PanelBody>
      </Tabs>
    </Panel>
  );
}
