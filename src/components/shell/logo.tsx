import { cn } from "@/lib/utils";
import * as React from "react";

/**
 * Needle in a haystack: the mark is the Iconmind `needle-haystack` outline
 * (MIT, https://github.com/Iconmind/iconmind) drawn with a gradient stroke,
 * no background tile.
 */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
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
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      <defs>
        {/* userSpaceOnUse: a bounding-box gradient on a straight horizontal line has zero height and paints nothing */}
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="3" y1="4" x2="21" y2="20">
          <stop offset="0%" stopColor="oklch(0.6 0.22 275)" />
          <stop offset="55%" stopColor="oklch(0.68 0.17 250)" />
          <stop offset="100%" stopColor="oklch(0.8 0.13 200)" />
        </linearGradient>
      </defs>
      <path d="M3 4h18" />
      <path d="M3 8h18" />
      <circle cx="12" cy="12" r="1.6" fill={`url(#${id})`} stroke="none" />
      <path d="M3 16h18" />
      <path d="M3 20h18" />
    </svg>
  );
}

/** Logo plus wordmark, for the sidebar header. */
export function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={compact ? 24 : 30} />
      {!compact && (
        <div className="grid text-left leading-tight">
          <span className="bg-gradient-to-r from-[oklch(0.55_0.2_270)] via-[oklch(0.62_0.17_245)] to-[oklch(0.7_0.14_205)] bg-clip-text text-sm font-semibold tracking-tight text-transparent dark:from-[oklch(0.72_0.16_262)] dark:via-[oklch(0.76_0.14_235)] dark:to-[oklch(0.82_0.12_200)]">Lineage</span>
          <span className="truncate text-[11px] text-muted-foreground">processing provenance</span>
        </div>
      )}
    </div>
  );
}
