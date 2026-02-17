import { useState } from "react";
import { Shield, Scan, Rocket, Home } from "lucide-react";
import type { AppView } from "./types/scan";
import { HomeView } from "./components/HomeView";
import { ScanView } from "./components/ScanView";
import { DeployView } from "./components/DeployView";

const navItems: { id: AppView; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "scan", label: "Scan", icon: Scan },
  { id: "deploy", label: "Deploy", icon: Rocket },
];

function App() {
  const [view, setView] = useState<AppView>("home");

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-[var(--border)] bg-[var(--background)]">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 border-b border-[var(--border)] px-5">
          <Shield className="h-5 w-5 text-[var(--foreground)]" />
          <span className="text-sm font-bold tracking-tight">Clawkeeper</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                view === item.id
                  ? "bg-[var(--muted)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-5 py-3">
          <p className="text-xs text-[var(--muted-foreground)]">
            Clawkeeper v0.1.0
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {view === "home" && <HomeView onNavigate={setView} />}
        {view === "scan" && <ScanView />}
        {view === "deploy" && <DeployView />}
      </main>
    </div>
  );
}

export default App;
