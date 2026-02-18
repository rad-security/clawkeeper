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
];
