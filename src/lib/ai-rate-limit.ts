// In-memory per-key daily counter for the AI endpoints. Resets on redeploy,
// which is fine at this project's single-instance Railway scale and avoids
// needing a DB table (or Redis) just to throttle a funded shared API key.
const counts = new Map<string, { day: string; count: number }>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function checkAndIncrement(key: string, limit: number): boolean {
  const day = today();
  const entry = counts.get(key);
  if (!entry || entry.day !== day) {
    counts.set(key, { day, count: 1 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export const HINT_DAILY_LIMIT = 30;
export const GENERATE_DAILY_LIMIT = 20;
