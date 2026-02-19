export interface SidebarItem {
  title: string;
  href: string;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export const sidebarNav: SidebarSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Overview", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Configuration", href: "/docs/configuration" },
    ],
  },
  {
    title: "Usage",
    items: [
      { title: "CLI Reference", href: "/docs/cli" },
      { title: "Grading", href: "/docs/grading" },
    ],
  },
  {
    title: "Security Checks",
    items: [
      { title: "All Checks", href: "/docs/checks" },
      { title: "Host Hardening", href: "/docs/checks/host_hardening" },
      { title: "Network", href: "/docs/checks/network" },
      { title: "Prerequisites", href: "/docs/checks/prerequisites" },
      { title: "Security Audit", href: "/docs/checks/security_audit" },
    ],
  },
  {
    title: "Dashboard",
    items: [
      { title: "Features", href: "/docs/dashboard" },
      { title: "Notifications", href: "/docs/notifications" },
      { title: "Plans & Pricing", href: "/docs/plans" },
    ],
  },
  {
    title: "Compare",
    items: [
      { title: "vs ClawSec", href: "/docs/compare/clawsec" },
      { title: "vs OpenClaw Native", href: "/docs/compare/openclaw-native" },
    ],
  },
];
