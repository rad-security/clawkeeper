"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Apple, Terminal } from "lucide-react";

interface PlatformTabsProps {
  macOS: React.ReactNode;
  linux: React.ReactNode;
  defaultPlatform?: "macos" | "linux";
}

export function PlatformTabs({ macOS, linux, defaultPlatform = "macos" }: PlatformTabsProps) {
  return (
    <Tabs defaultValue={defaultPlatform} className="my-6">
      <TabsList className="bg-white/5 border border-white/10">
        <TabsTrigger
          value="macos"
          className="data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 text-zinc-400 gap-1.5"
        >
          <Apple className="h-4 w-4" />
          macOS
        </TabsTrigger>
        <TabsTrigger
          value="linux"
          className="data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 text-zinc-400 gap-1.5"
        >
          <Terminal className="h-4 w-4" />
          Linux
        </TabsTrigger>
      </TabsList>
      <TabsContent value="macos">{macOS}</TabsContent>
      <TabsContent value="linux">{linux}</TabsContent>
    </Tabs>
  );
}
