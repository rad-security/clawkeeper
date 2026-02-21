export interface SidebarItem {
  title: string;
  href: string;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export const tutorialSidebarNav: SidebarSection[] = [
  {
    title: "Tutorials",
    items: [
      { title: "All Tutorials", href: "/tutorials" },
    ],
  },
  {
    title: "Getting Started",
    items: [
      { title: "Install OpenClaw", href: "/tutorials/install-openclaw" },
    ],
  },
  {
    title: "Hardening",
    items: [
      { title: "Harden macOS", href: "/tutorials/harden-macos-for-openclaw" },
      { title: "Harden Linux", href: "/tutorials/harden-linux-for-openclaw" },
    ],
  },
  {
    title: "Deployment & Audit",
    items: [
      { title: "Docker Deployment", href: "/tutorials/deploy-openclaw-docker" },
      { title: "Security Audit", href: "/tutorials/openclaw-security-audit" },
    ],
  },
  {
    title: "Advanced",
    items: [
      { title: "Skills Security", href: "/tutorials/openclaw-skills-security" },
      { title: "Continuous Monitoring", href: "/tutorials/continuous-monitoring" },
      { title: "Runtime Shield Setup", href: "/tutorials/runtime-shield-setup" },
    ],
  },
];
