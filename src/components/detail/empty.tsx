import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/** Zero-data card shared by the detail tabs. */
export function EmptyState({ icon: Icon, title, description, className }: { icon: LucideIcon; title: string; description?: string; className?: string }) {
  return (
    <div className={cn("flex h-full flex-col items-center justify-center gap-2 p-8 text-center", className)}>
      <div className="rounded-full border bg-muted/40 p-3">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
