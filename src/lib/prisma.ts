import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

let cached: PrismaClient | undefined = globalForPrisma.prisma;

// Build the real client lazily, on first actual use, instead of at module
// import time. `next build` statically imports every API route module to
// collect its config, which has no DATABASE_URL available — constructing
// (and connection-string-checking) the client eagerly at the top level
// would crash the whole build the moment any route imported this module.
function getPrismaClient(): PrismaClient {
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set to connect to PostgreSQL.");
  }
  const adapter = new PrismaPg({ connectionString });
  cached = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") {
    // Survive Next.js dev Fast Refresh re-evaluating this module, so a hot
    // reload doesn't leak a new client/connection pool on every save.
    globalForPrisma.prisma = cached;
  }
  return cached;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop);
    // $transaction/$connect/etc. are real PrismaClient methods that read
    // internal state via `this` — bind them to the real client so calling
    // them as `prisma.$transaction(...)` (this = the proxy) still works.
    return typeof value === "function" ? value.bind(client) : value;
  },
  // Without a `has` trap, `in` falls through to the empty placeholder
  // target instead of the real client — see src/lib/auth.ts for the exact
  // failure this caused there (toNextJsHandler's `"handler" in auth`
  // always false).
  has(_target, prop) {
    return prop in getPrismaClient();
  },
});

export default prisma;
