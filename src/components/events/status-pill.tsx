"use client";

import { Badge } from "@/components/ui/badge";
import type { JobStatus, RunStatus } from "@/lib/api/types";
import { JOB_STATUS, RUN_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import * as React from "react";

export const RunStatusPill = React.memo(function RunStatusPill({ status, className }: { status: RunStatus; className?: string }) {
  const s = RUN_STATUS[status] ?? RUN_STATUS.RUNNING;
  return (
    <Badge variant="outline" className={cn("h-5 gap-1 px-1.5 text-[11px]", s.className, className)}>
      <span className={cn("size-1.5 rounded-full", status === "RUNNING" && "animate-pulse")} style={{ background: s.color }} />
      {s.label}
    </Badge>
  );
});

export function JobStatusPill({ status, className }: { status: JobStatus; className?: string }) {
  const s = JOB_STATUS[status] ?? JOB_STATUS.QUEUED;
  return (
    <Badge variant="outline" className={cn("h-5 px-1.5 text-[11px]", s.className, className)}>
      {s.label}
    </Badge>
  );
}
