/**
 * Where to send someone after sign-in. Only our own dashboard or tutor
 * paths are allowed, so a link can never bounce a learner to another site.
 */
export function safeNext(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  return /^\/(dashboard|tutor)(\/[a-z0-9/-]*)?$/i.test(next) ? next : fallback;
}
