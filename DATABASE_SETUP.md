# Oat & Ember — Database setup

The app uses PostgreSQL (Neon) through Prisma. Production deployments run committed migrations automatically through `vercel.json`.

## Local development

1. Put your Neon connection string in `.env.local` as `DATABASE_URL`.
2. Ensure `NEXTAUTH_SECRET`, `DATA_ENCRYPTION_KEY`, and `DATA_HASH_SECRET` are set.
3. Run `npm run db:setup` once for a fresh database.
4. Run `npm run dev`.

`npm run dev` no longer pushes/seeds the database automatically, so starting the UI does not unexpectedly mutate a production database.

## Production / Vercel

Set the same required environment variables in Vercel. The build command runs `prisma migrate deploy` before `next build`, so the database schema is upgraded from the committed migration history. Run `npm run prisma:seed` manually against production once if you need the admin account seeded.

## Rewards

Rewards are not hard-coded. The API calculates qualifying orders from the authenticated user's real `Order` rows. Cancelled/rejected orders do not count. Every 10 qualifying orders unlocks one free-coffee reward.

Examples: 0 orders → 0 rewards; 2 orders → 0 rewards; 9 orders → 0 rewards; 10 orders → 1 reward; 20 orders → 2 rewards.

## Google sign-in

Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Google accounts are stored in the same `User` table and can later place orders using OTP verification for a phone number. Existing password accounts with the same email are linked to the same customer record.
