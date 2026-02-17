"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: { icon: "h-5 w-5", text: "text-lg" },
  md: { icon: "h-6 w-6", text: "text-xl" },
  lg: { icon: "h-7 w-7", text: "text-2xl" },
} as const;

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  iconOnly?: boolean;
}

export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  const gradId = `ck-${id}`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="6"
          y1="2"
          x2="18"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#06b6d4" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {/* Three claw marks fanning out from convergence point */}
      <path
        d="M10 4C8 10 5.5 15 4 20"
        stroke={`url(#${gradId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M12 3C12 9 12 15 12 21"
        stroke={`url(#${gradId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M14 4C16 10 18.5 15 20 20"
        stroke={`url(#${gradId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* AI focal node at convergence */}
      <circle cx="12" cy="3" r="1.8" fill={`url(#${gradId})`} />
    </svg>
  );
}

export function Logo({ size = "sm", className, iconOnly = false }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark className={s.icon} />
      {!iconOnly && (
        <span
          className={cn(s.text, "font-bold tracking-tight")}
          style={{ fontFamily: "var(--font-space-grotesk, inherit)" }}
        >
          Clawkeeper
        </span>
      )}
    </div>
  );
}
