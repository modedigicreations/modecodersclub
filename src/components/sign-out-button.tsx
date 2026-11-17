"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { clearOffline } from "@/lib/offline-handbooks";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  const signOut = async () => {
    await authClient.signOut();
    // Saved handbooks hold course content: don't leave them on a shared computer.
    await clearOffline().catch(() => {});
    router.push("/");
    router.refresh();
  };

  return (
    <button type="button" className={className} onClick={() => void signOut()}>
      Sign out
    </button>
  );
}
