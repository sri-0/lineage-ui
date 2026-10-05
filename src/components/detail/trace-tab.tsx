"use client";

import { TraceView } from "@/components/trace/trace-view";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { traceOptions } from "@/lib/api/query-options";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { EmptyState } from "./empty";

export function TraceTab({ runId }: { runId: string }) {
  const { data, isLoading, error } = useQuery(traceOptions(runId));
  if (isLoading) return <Skeleton className="m-3 h-[calc(100%-1.5rem)]" />;
  if (error) {
    const e = error as ApiError;
    const title = e.reason === "no_trace" ? "No trace recorded" : e.status === 404 ? "Trace not found in the backend" : "Trace unavailable";
    return <EmptyState icon={Activity} title={title} description={e.message} />;
  }
  if (!data) return null;
  return <TraceView otlp={data} className="h-full" />;
}
