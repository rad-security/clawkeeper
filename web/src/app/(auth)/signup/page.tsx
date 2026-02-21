"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
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
  Gift,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";

function SignupForm() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState(refCode);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const validateRef = useCallback(async (code: string) => {
    if (!code || !/^CK[A-Z2-9]{6}$/i.test(code)) {
      setReferralValid(null);
      return;
    }
    setReferralChecking(true);
    try {
      const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      setReferralValid(data.valid);
    } catch {
      setReferralValid(null);
    } finally {
      setReferralChecking(false);
    }
  }, []);

  // Validate on mount if ref param provided
  useEffect(() => {
    if (refCode) validateRef(refCode);
  }, [refCode, validateRef]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const metadata: Record<string, string> = { full_name: fullName };
    if (referralCode && referralValid) {
      metadata.referral_code = referralCode.toUpperCase();
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
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
              text: "44 automated security checks",
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
            <SocialAuthButtons referralCode={referralCode} />
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-zinc-900 px-2 text-zinc-500">or continue with email</span></div>
            </div>
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
              <div className="space-y-2">
                <Label htmlFor="referral" className="text-zinc-300">Invite code <span className="text-zinc-500">(optional)</span></Label>
                <Input
                  id="referral"
                  placeholder="CKXXXXXX"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value);
                    validateRef(e.target.value);
                  }}
                  maxLength={8}
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500 uppercase"
                />
                {referralChecking && (
                  <p className="text-xs text-zinc-500">Checking...</p>
                )}
                {referralValid === true && (
                  <p className="flex items-center gap-1 text-xs text-green-400">
                    <Gift className="h-3 w-3" />
                    Valid! You&apos;ll get +5 bonus scan credits
                  </p>
                )}
                {referralValid === false && referralCode.length >= 8 && (
                  <p className="text-xs text-red-400">Invalid or expired code</p>
                )}
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

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
