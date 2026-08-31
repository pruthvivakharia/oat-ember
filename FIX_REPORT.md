# Oat & Ember — production hardening pass

This pass builds on the authentication/database work already present in the project. The goal is a polished café demo that can be hardened into a production deployment without trusting browser data.

## Authentication

- Customer login requires a verified phone number.
- Registration now requires a one-time WhatsApp OTP before the account is created.
- Added password reset using the registered email + mobile + one-time OTP.
- Passwords remain bcrypt hashes; they are never reversible.
- Removed the production-facing demo admin password from the login screen.
- Removed the client-side authentication debug log.
- NextAuth debug mode is disabled in production.

## Data protection

- Customer PII remains AES-256-GCM encrypted at rest.
- Blind indexes require `DATA_HASH_SECRET`; there is no fallback to `NEXTAUTH_SECRET`.
- Seed scripts now fail if encryption/hash secrets or a strong admin password are missing.
- `.env.local` is ignored by Git.

## Checkout/order integrity

- Server-side validation covers customer data, handover data and product customizations.
- Ordering hours are enforced server-side and are configurable with environment variables.
- Cash orders use one-time OTP verification, while already verified signed-in customers do not need to repeat OTP for every cash order.
- Guest tracking tokens are now high-entropy random tokens for newly created orders.
- Public tracking responses minimize sensitive handover information.

## Razorpay hardening

- Added a server-side `PaymentIntent` record containing the exact validated checkout payload.
- Final order creation uses the stored PaymentIntent rather than trusting the browser's cart after payment.
- Added signature, order, amount, currency and captured-status verification.
- Added duplicate-payment/idempotency protection.
- Added `/api/payment/webhook` for `payment.captured` and `payment.failed` reconciliation.
- Added `/api/payment/status` so the UI can disable online checkout cleanly until the café connects Razorpay.

## Admin reliability

- Sensitive admin APIs re-check the current database role.
- Admin realtime has a 15-second polling fallback for serverless deployments.

## UX polish

- Added production metadata and a custom app icon.
- Added global focus-visible treatment and reduced-motion support.
- Improved authentication copy and removed developer-facing error text.
- Added overflow protection for auth inputs.
- Added a dedicated password-recovery screen.

## Validation note

The project source was syntax-parsed across all TypeScript/TSX files after the hardening pass with zero parser diagnostics. A full dependency-backed Next.js/Prisma build still needs to be run in the user's normal VS Code environment after `npm install`, because the review container does not have the project's `node_modules` and package downloads are unavailable here.
