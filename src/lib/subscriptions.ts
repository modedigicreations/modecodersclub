import prisma from "@/lib/prisma";

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const row = await prisma.subscription.findFirst({
    where: { userId, status: "active", expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return row !== null;
}
