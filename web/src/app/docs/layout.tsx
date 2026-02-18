"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { sidebarNav } from "@/lib/docs/sidebar";
import { Menu, X } from "lucide-react";
import { useState } from "react";

function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6 text-sm">
      {sidebarNav.map((section) => (
        <div key={section.title}>
          <h4 className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
            {section.title}
          </h4>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`block rounded-md px-3 py-1.5 transition ${
                      active
                        ? "bg-white/10 text-cyan-400"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/">
              <Logo className="text-white" />
            </Link>
            <span className="hidden text-sm text-zinc-500 sm:inline">/</span>
            <Link
              href="/docs"
              className="hidden text-sm font-medium text-zinc-300 hover:text-white sm:inline"
            >
              Docs
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Dashboard
            </Link>
            <a
              href="https://github.com/rad-security/clawkeeper"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              GitHub
            </a>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="ml-2 rounded-md p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-white/10 lg:block">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pl-4 pr-6">
            <DocsSidebar />
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 top-14 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative h-full w-72 overflow-y-auto border-r border-white/10 bg-black p-6">
              <DocsSidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        {/* Content */}
        <main className="min-w-0 flex-1 px-6 py-10 sm:px-10 lg:px-16">
          <article className="mx-auto max-w-3xl">{children}</article>
        </main>
      </div>
    </div>
  );
}
