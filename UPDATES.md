# Backend production update

- Replaced plaintext customer PII columns with AES-256-GCM encrypted fields.
- Added blind hashes for email/phone lookup.
- Passwords use bcrypt hashes.
- Added WhatsApp OTP challenge flow with expiry, attempts, resend cooldown and daily request limits.
- Cash orders require a one-time verified OTP token.
- Removed the SMS integration from order notifications.
- Added WhatsApp order accepted/prepared/ready notification flow.
- Added notification delivery records.
- Hardened Razorpay verification against signature, amount, currency, capture status and duplicate payment replay.
- Fixed NextAuth `authOptions` architecture by keeping it in `lib/auth.ts` and importing it from route handlers.
- Changed TypeScript target to ES2020 to support server-side Map iteration cleanly.
- Added production PostgreSQL environment configuration.
- Added admin seed credentials via environment variables.
