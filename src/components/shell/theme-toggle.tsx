"use client";

import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useHydrated } from "@/hooks/use-hydrated";

const ORDER = ["dark", "light", "system"] as const;

/** Cycles dark → light → system. Rendered inside the sidebar menu. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useHydrated();
  const current = (mounted ? theme : "dark") as (typeof ORDER)[number];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = current === "dark" ? Moon : current === "light" ? Sun : Monitor;
  const label = `Theme: ${current} (click for ${next})`;
  return (
    <SidebarMenuButton tooltip={label} onClick={() => setTheme(next)}>
      <Icon />
      <span className="capitalize">{current} theme</span>
    </SidebarMenuButton>
  );
}
