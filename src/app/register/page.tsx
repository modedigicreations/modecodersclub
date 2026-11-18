import type { Metadata } from "next";
import { RegisterForm } from "@/components/register-form";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = {
  title: "Create a community account",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <RegisterForm next={safeNext(next, "")} />;
}
