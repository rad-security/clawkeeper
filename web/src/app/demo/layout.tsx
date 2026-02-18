import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule an Enterprise Demo",
  description:
    "Get a personalized walkthrough of Clawkeeper Enterprise for Kubernetes. Hardened Helm charts, eBPF runtime detection, and fleet-wide security monitoring.",
  openGraph: {
    title: "Clawkeeper Enterprise Demo",
    description:
      "See how Clawkeeper secures OpenClaw deployments in Kubernetes with eBPF runtime detection and real-time KSPM.",
  },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
