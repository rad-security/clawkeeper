import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Clawkeeper — OpenClaw Security Scanner by RAD Security",
    template: "%s | Clawkeeper",
  },
  description:
    "Your OpenClaw AI agents are exposed. Clawkeeper scans for misconfigurations, exposed credentials, malicious skills, and CVEs in 60 seconds. Free CLI, Pro monitoring dashboard, and Enterprise Kubernetes hardening with eBPF runtime detection. By RAD Security.",
  keywords: [
    "OpenClaw security",
    "AI agent security",
    "OpenClaw scanner",
    "OpenClaw hardening",
    "AI agent vulnerability scanner",
    "Clawkeeper",
    "RAD Security",
    "eBPF runtime detection",
    "Kubernetes security",
    "KSPM",
    "AI ITDR",
    "agent security posture",
  ],
  authors: [{ name: "RAD Security", url: "https://www.radsecurity.ai" }],
  creator: "RAD Security",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://clawkeeper.dev",
    siteName: "Clawkeeper",
    title: "Clawkeeper — OpenClaw Security Scanner",
    description:
      "Scan your OpenClaw deployment for misconfigurations, exposed credentials, and vulnerabilities in 60 seconds. Free CLI + Pro dashboard by RAD Security.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clawkeeper — OpenClaw Security Scanner",
    description:
      "42 automated security checks for OpenClaw. Free CLI scanner + Pro fleet monitoring dashboard. By RAD Security.",
    creator: "@rabornyev",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
