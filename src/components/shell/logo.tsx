import { cn } from "@/lib/utils";
import * as React from "react";

/** The mark: lucide `chart-no-axes-gantt` drawn with a thick gradient stroke and no background tile. */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  // React 19 ids contain characters a CSS url(#…) reference rejects; keep only safe ones
  const id = "logo-" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={`url(#${id})`}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      <defs>
        {/* userSpaceOnUse: a bounding-box gradient on a straight horizontal line has zero height and paints nothing */}
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="6" y1="6" x2="18" y2="18">
          <stop offset="0%" stopColor="oklch(0.62 0.22 275)" />
          <stop offset="55%" stopColor="oklch(0.7 0.17 250)" />
          <stop offset="100%" stopColor="oklch(0.82 0.13 200)" />
        </linearGradient>
      </defs>
      <path d="M8 6h10" />
      <path d="M6 12h9" />
      <path d="M11 18h7" />
    </svg>
  );
}

/** Logo plus wordmark, for the sidebar header; the wordmark hides when the sidebar is collapsed. */
export function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Logo size={28} />
      <div className="grid min-w-0 text-left leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate bg-gradient-to-r from-[oklch(0.74_0.17_270)] via-[oklch(0.78_0.14_240)] to-[oklch(0.84_0.12_200)] bg-clip-text text-sm font-semibold tracking-tight text-transparent">Haystack</span>
        <span className="truncate text-[11px] text-muted-foreground">processing provenance</span>
      </div>
    </div>
  );
}
