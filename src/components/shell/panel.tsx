"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import * as React from "react";

/** Inset panel chrome shared by the filters and assistant panels. */
export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden p-1", className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card text-card-foreground">{children}</div>
    </div>
  );
}

export function PanelHeader({
  title,
  icon,
  actions,
  onClose,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
      {icon}
      <h2 className="truncate text-sm font-medium">{title}</h2>
      <div className="ml-auto flex items-center gap-1">
        {actions}
        {onClose && (
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose} aria-label={`Close ${typeof title === "string" ? title : "panel"}`}>
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto", className)}>{children}</div>;
}
