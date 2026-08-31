import { config } from "dotenv";
// Load .env first, then .env.local on top (matching Next.js's own env
// precedence). Without this, `prisma db seed` only ever sees .env and
// silently falls back to different secrets than the running app for any
// key that only lives in .env.local (e.g. DATA_HASH_SECRET,
// DATA_ENCRYPTION_KEY) — causing hashed lookups to mismatch forever.
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: env("DATABASE_URL"),
  },
});
