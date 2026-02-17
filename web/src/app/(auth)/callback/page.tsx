"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Dynamically import to avoid SSR issues with env vars
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          router.push("/dashboard");
          router.refresh();
        }
      });
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Confirming your login...</p>
    </div>
  );
}
