"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: { icon: 22, text: "text-lg" },
  md: { icon: 28, text: "text-xl" },
  lg: { icon: 34, text: "text-2xl" },
} as const;

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  iconOnly?: boolean;
}

export function LogoMark({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Clawkeeper"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      unoptimized
    />
  );
}

export function Logo({ size = "sm", className, iconOnly = false }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark size={s.icon} />
      {!iconOnly && (
        <span
          className={cn(s.text, "font-bold tracking-tight")}
          style={{ fontFamily: "var(--font-space-grotesk, inherit)" }}
        >
          <span className="text-white">Claw</span>
          <span className="text-cyan-400">keeper</span>
        </span>
      )}
    </div>
  );
}
