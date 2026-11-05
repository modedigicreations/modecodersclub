import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx scripts/seed-courses.ts",
  },
  datasource: {
    // `env("DATABASE_URL")` throws at config-load time if the variable is
    // unset, which breaks `prisma generate` (a pure codegen step that never
    // connects to a database) during a Railpack build step where
    // DATABASE_URL may not be injected yet. Fall back to a syntactically
    // valid placeholder so generate always works; migrate/studio/the app
    // itself all read the real DATABASE_URL at the point they actually
    // connect, so a genuinely missing value still fails there, correctly.
    url: process.env.DATABASE_URL || "postgresql://unset:unset@localhost:5432/unset",
  },
});
