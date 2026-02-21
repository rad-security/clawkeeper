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
import { Logo } from "@/components/Logo";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleMagicLink() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
    } else {
      setError("");
      toast.success("Check your email for the login link!");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <Card className="w-full max-w-md border-white/10 bg-zinc-900">
        <CardHeader className="text-center">
          <div className="flex justify-center">
            <Logo size="lg" className="text-white" />
          </div>
          <CardDescription className="text-zinc-400">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <SocialAuthButtons />
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-zinc-900 px-2 text-zinc-500">or continue with email</span></div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full border-white/10 text-zinc-300 hover:text-white"
              onClick={handleMagicLink}
              disabled={loading || !email}
            >
              Send magic link
            </Button>
            <p className="text-center text-sm text-zinc-500">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-cyan-400 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
