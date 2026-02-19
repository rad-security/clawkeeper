import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up — Free OpenClaw Security Dashboard",
  description:
    "Create a free Clawkeeper account. Monitor your OpenClaw deployments with 43 automated security checks, letter grades, and real-time alerts. No credit card required.",
  openGraph: {
    title: "Sign Up for Clawkeeper",
    description:
      "Free dashboard for OpenClaw security monitoring. 1 host, 7 days history, instant setup.",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
