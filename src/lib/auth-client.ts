"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

// `import type` only — never import `auth` itself here, which would pull
// Prisma/Better Auth server code into the client bundle. This plugin just
// gives signUp.email/useSession the additionalFields (role) types.
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
