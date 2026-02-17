"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // This page handles implicit flow (hash-based tokens)
    // PKCE flow is handled by /auth/callback/route.ts
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");

    if (accessToken) {
      import("@/lib/supabase/client").then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth
          .setSession({
            access_token: accessToken,
            refresh_token: hashParams.get("refresh_token") ?? "",
          })
          .then(() => {
            router.push("/dashboard");
            router.refresh();
          });
      });
    } else {
      // No hash token — redirect to login
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-cyan-400" />
        <p className="text-zinc-400">Confirming your login...</p>
      </div>
    </div>
  );
}
