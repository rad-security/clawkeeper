"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Check,
  Terminal,
  Monitor,
  Bell,
  BarChart3,
} from "lucide-react";
import { Logo } from "@/components/Logo";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <Card className="w-full max-w-md border-white/10 bg-zinc-900 text-white">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Check your email</CardTitle>
            <CardDescription className="text-zinc-400">
              We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to
              activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline" className="w-full border-white/10 text-zinc-300 hover:text-white">
                Back to login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black">
      {/* Left panel: value proposition */}
      <div className="hidden flex-1 flex-col justify-center border-r border-white/10 px-12 lg:flex">
        <Link href="/" className="mb-8">
          <Logo size="md" className="text-white" />
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Start securing your
          <br />
          <span className="gradient-text">OpenClaw deployment.</span>
        </h2>
        <p className="mt-3 text-zinc-400">
          Create a free account and get instant access to the security dashboard.
        </p>
        <div className="mt-8 space-y-4">
          {[
            {
              icon: Terminal,
              text: "43 automated security checks",
            },
            {
              icon: Check,
              text: "Letter grade scoring with auto-fix",
            },
            {
              icon: Monitor,
              text: "Dashboard to track security posture",
            },
            {
              icon: Bell,
              text: "Alerts on grade drops and new threats",
            },
            {
              icon: BarChart3,
              text: "Score history and trend tracking",
            },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <item.icon className="h-5 w-5 shrink-0 text-cyan-400" />
              <span className="text-sm text-zinc-300">{item.text}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-zinc-600">
          Free forever for 1 host. No credit card required.
        </p>
      </div>

      {/* Right panel: form */}
      <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-md border-0 bg-transparent shadow-none lg:border lg:border-white/10 lg:bg-zinc-900 lg:shadow-sm">
          <CardHeader className="text-center">
            <div className="mb-2 flex justify-center lg:hidden">
              <Logo className="text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Create your account</CardTitle>
            <CardDescription className="text-zinc-400">
              Free forever for 1 host. No credit card required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">Full name</Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button
                type="submit"
                className="btn-rad w-full bg-cyan-500 text-black font-medium hover:bg-cyan-400"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create free account"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link href="/login" className="text-cyan-400 hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
