# Oat & Ember — security handoff checklist

## Passwords and customer login data

- Customer passwords are stored only as bcrypt hashes (`passwordHash`). There is no API, admin screen, email, or receipt that returns a password or password hash.
- Email, phone, name, and fulfillment details are encrypted at rest with AES-256-GCM using `DATA_ENCRYPTION_KEY`.
- Email and phone lookups use keyed HMAC blind indexes with `DATA_HASH_SECRET`; the database does not need plaintext contact values to authenticate a customer.
- `DATA_ENCRYPTION_KEY` and `DATA_HASH_SECRET` must be different high-entropy secrets.
- Anyone who controls the production runtime environment and its encryption secret can technically decrypt customer PII. If the café owner must not have that capability, keep the encryption key in a separate KMS/secret-management boundary controlled by the service operator.

## Before production

- [ ] Add `.env.local` to `.gitignore` and never commit it.
- [ ] Rotate any database, Razorpay, SMTP or WhatsApp credentials that were ever exposed outside the private deployment environment.
- [ ] Set `ADMIN_PASSWORD` to a strong unique password (12+ characters recommended).
- [ ] Set `DATA_ENCRYPTION_KEY` and `DATA_HASH_SECRET` and back them up separately.
- [ ] Configure WhatsApp Cloud API and approve the OTP/order templates.
- [ ] Configure Razorpay live keys and a `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Register `POST /api/payment/webhook` in Razorpay and enable `payment.captured` and `payment.failed` events.
- [ ] Configure SMTP if the café wants email receipts/owner alerts.
- [ ] Verify the café's actual address, opening hours, contact number, policies and menu before launch.
- [ ] Test registration OTP, password reset, cash checkout, Razorpay test payment, webhook reconciliation, order tracking and admin transitions.

## Payment safety

The browser is never trusted for the final amount. The server loads products from PostgreSQL and calculates the total. Razorpay checkout details are stored as a server-side `PaymentIntent`, and the final order is created from that persisted intent after signature/capture/amount checks. The webhook can also finalize a captured payment if the customer's browser disappears after payment.

## Public tracking

Guest tracking uses a high-entropy random token. Public responses mask the phone number and minimize handover data. The raw tracking token is not printed on the receipt body.

## Operations

Admin APIs re-check the current database role instead of relying only on a stale client-side role. The admin dashboard also keeps a polling fallback because process-local SSE events are not guaranteed to cross serverless instances.
