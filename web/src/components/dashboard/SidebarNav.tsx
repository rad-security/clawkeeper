"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Monitor,
  Bell,
  Activity,
  Settings,
  Zap,
  BookOpen,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/hosts", label: "Hosts", icon: Monitor },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

export function SidebarNav({ plan }: { plan?: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 p-2">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}

      {/* Upgrade CTA for free users */}
      {plan === "free" && (
        <Link
          href="/upgrade"
          className="mt-4 flex items-center gap-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-100"
        >
          <Zap className="h-4 w-4" />
          <span className="flex-1">Upgrade</span>
          <Badge className="bg-cyan-600 text-[10px] text-white">Pro</Badge>
        </Link>
      )}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <header className="flex h-14 items-center gap-4 border-b px-4 md:hidden">
      <Logo />
      <nav className="ml-auto flex gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md p-2",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
