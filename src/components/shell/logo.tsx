import { cn } from "@/lib/utils";
import { Waypoints } from "lucide-react";

/** Gradient tile with the waypoints mark: nodes joined along a path, i.e. provenance. */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden text-white shadow-md shadow-blue-950/30", className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: "linear-gradient(135deg, oklch(0.55 0.22 275) 0%, oklch(0.66 0.18 250) 50%, oklch(0.8 0.13 200) 100%)",
      }}
    >
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 28% 18%, rgba(255,255,255,0.4), transparent 55%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "linear-gradient(to top, rgba(10,20,60,0.25), transparent)" }} />
      <Waypoints className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" style={{ width: size * 0.58, height: size * 0.58 }} strokeWidth={2.25} />
    </div>
  );
}

/** Logo plus wordmark, for the sidebar header. */
export function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={32} />
      {!compact && (
        <div className="grid text-left leading-tight">
          <span className="bg-gradient-to-r from-[oklch(0.72_0.16_262)] via-[oklch(0.76_0.14_235)] to-[oklch(0.82_0.12_200)] bg-clip-text text-sm font-semibold tracking-tight text-transparent">Lineage</span>
          <span className="truncate text-[11px] text-muted-foreground">processing provenance</span>
        </div>
      )}
    </div>
  );
}
