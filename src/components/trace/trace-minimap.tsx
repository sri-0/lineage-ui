"use client";

import * as React from "react";
import { serviceColor, type SpanRow, type Trace } from "./span-tree";

/**
 * Overview of the whole trace with a draggable brush that zooms the rows
 * below. Drawn on a canvas: one thin bar per span, coloured by service.
 */
export function TraceMinimap({ trace, rows, range, onRangeChange }: { trace: Trace; rows: SpanRow[]; range: [number, number]; onRangeChange: (r: [number, number]) => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [drag, setDrag] = React.useState<{ start: number; cur: number } | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const draw = () => {
      const w = wrap.clientWidth;
      const h = 56;
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.clearRect(0, 0, w, h);
      const all = trace.spans;
      const rowH = Math.max(1, Math.min(4, (h - 4) / Math.max(all.length, 1)));
      const total = Math.max(1, trace.durationNs);
      all.forEach((s, i) => {
        ctx.fillStyle = serviceColor(s.service, trace.services);
        ctx.globalAlpha = s.statusCode === "ERROR" ? 1 : 0.7;
        const x = ((s.startNs - trace.startNs) / total) * w;
        const bw = Math.max(1, (s.durationNs / total) * w);
        ctx.fillRect(x, 2 + i * rowH, bw, Math.max(1, rowH - 0.5));
      });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [trace, rows]);

  const pos = (clientX: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    const start = pos(e.clientX);
    setDrag({ start, cur: start });
    const move = (ev: PointerEvent) => setDrag((d) => (d ? { ...d, cur: pos(ev.clientX) } : d));
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const end = pos(ev.clientX);
      setDrag(null);
      if (Math.abs(end - start) < 0.01) onRangeChange([0, 1]);
      else onRangeChange([Math.min(start, end), Math.max(start, end)]);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const sel = drag ? [Math.min(drag.start, drag.cur), Math.max(drag.start, drag.cur)] : range;
  const zoomed = range[0] > 0 || range[1] < 1;
  return (
    <div className="relative shrink-0 border-b bg-muted/20 px-0" title={zoomed ? "Click to reset zoom" : "Drag to zoom"}>
      <div ref={wrapRef} className="relative h-14 cursor-crosshair select-none" onPointerDown={onPointerDown}>
        <canvas ref={canvasRef} className="absolute inset-0" />
        {(zoomed || drag) && (
          <>
            <div className="absolute inset-y-0 left-0 bg-background/70" style={{ width: `${sel[0] * 100}%` }} />
            <div className="absolute inset-y-0 right-0 bg-background/70" style={{ width: `${(1 - sel[1]) * 100}%` }} />
            <div className="absolute inset-y-0 border-x border-primary/70" style={{ left: `${sel[0] * 100}%`, width: `${(sel[1] - sel[0]) * 100}%` }} />
          </>
        )}
      </div>
    </div>
  );
}
