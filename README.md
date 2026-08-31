# Oat & Ember Café — ordering platform

A premium café ordering experience for fast takeaway, curbside vehicle handover and office delivery.

## Product flow

`Home → Menu → Customize → Bag → Handover → Payment → Live tracking → Receipt`

Customer accounts add:

- verified mobile registration
- saved contact details
- order history
- reorder
- favorites
- password recovery
- testimonials

The admin control room adds:

- live/polling order board
- revenue and volume snapshots
- order status progression
- customer contact actions
- handover details
- payment state
- WhatsApp/email notification hooks

## Security model

Passwords are bcrypt hashes, never encrypted/reversible. Customer name/email/phone and order handover details are AES-256-GCM encrypted at rest. Email/phone lookups use keyed HMAC blind indexes.

The café admin can see the contact information needed to fulfil an order, but the application never exposes a customer's password. If the database owner must also be unable to decrypt PII, the production encryption key must live outside the database owner's access boundary (for example, a separate KMS/secret-management account).

## Payments

Razorpay is optional until the café owner approves the account. When configured, checkout uses a server-side PaymentIntent, verifies the captured payment and supports Razorpay webhook reconciliation.

The online payment UI is automatically disabled until the required Razorpay environment variables are present.

## WhatsApp

WhatsApp Cloud API is also optional until the café provides the sender credentials and Meta-approved templates. Registration OTP and guest cash-order verification use WhatsApp once configured.

## Environment

Start from `.env.example` and set:

- PostgreSQL `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `DATA_ENCRYPTION_KEY`
- `DATA_HASH_SECRET`
- `ADMIN_*` seed credentials
- Razorpay keys + `RAZORPAY_WEBHOOK_SECRET` when payments are approved
- WhatsApp Cloud API credentials/templates when messaging is approved
- optional SMTP settings
- `ORDERING_TIME_ZONE`, `ORDERING_START_HOUR`, `ORDERING_END_HOUR`

Never commit `.env.local` or production secrets.

## Local setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

For a fresh database, the migration in `prisma/migrations/0_init` creates the main schema and `1_payment_intents` adds the payment reconciliation table.

## Production verification

Before launch, test:

1. registration + WhatsApp OTP
2. wrong/expired/replayed OTPs
3. login with wrong email/mobile/password
4. password reset
5. menu availability and server-side price validation
6. vehicle and office handover validation
7. cash checkout
8. Razorpay test checkout
9. Razorpay webhook reconciliation
10. duplicate payment protection
11. guest tracking
12. customer order history/reorder
13. admin status progression
14. WhatsApp accepted/prepared/ready templates
15. email receipts/owner alerts
16. mobile layout and reduced-motion behavior

## WhatsApp Cloud API — temporary test setup

The app keeps WhatsApp credentials server-side. Never put the access token in a client component or `NEXT_PUBLIC_*` variable.

### 1. Local environment

Add these values to `.env.local` (use the values from Meta's WhatsApp > Getting Started panel):

```text
WHATSAPP_ACCESS_TOKEN="..."
WHATSAPP_PHONE_NUMBER_ID="..."
WHATSAPP_GRAPH_VERSION="v25.0"
WHATSAPP_TEMPLATE_LANGUAGE="en_US"
WHATSAPP_OTP_TEMPLATE="<exact approved OTP template name>"
WHATSAPP_ORDER_ACCEPTED_TEMPLATE="<exact approved accepted template name>"
WHATSAPP_ORDER_PREPARED_TEMPLATE="<exact approved prepared template name>"
WHATSAPP_ORDER_READY_TEMPLATE="<exact approved ready template name>"

# Temporary testing: use the phone number that you already added to Meta's test recipient list.
WHATSAPP_OWNER_PHONE="<10-digit Indian number>"
WHATSAPP_OWNER_ORDER_TEMPLATE="<exact approved template name for the new-order alert>"

# Needed only when you enable the webhook below.
WHATSAPP_APP_SECRET="<Meta App Secret>"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="<your own long random string>"
```

`WHATSAPP_OWNER_PHONE` is intentionally separate from the customer's phone number. When the café owner accepts the project, replace this one environment variable with the owner's WhatsApp number and configure the approved owner-order template in Meta. The application code does not need to change.

### 2. What the app sends

- New cash/paid order → owner WhatsApp (`WHATSAPP_OWNER_ORDER_TEMPLATE`)
- Customer order status `PACKED` → customer's WhatsApp (`WHATSAPP_ORDER_PREPARED_TEMPLATE`)
- Customer order status `COMPLETED` → customer's WhatsApp (`WHATSAPP_ORDER_READY_TEMPLATE`)
- Registration/password/cash-order OTP → customer's WhatsApp (`WHATSAPP_OTP_TEMPLATE`)

For business-initiated messages, the template name and body parameter count must exactly match the approved Meta template.

### 3. Webhook endpoint

The code includes:

```text
GET  /api/whatsapp/webhook
POST /api/whatsapp/webhook
```

The GET handler performs Meta's `hub.verify_token` / `hub.challenge` verification. The POST handler verifies `x-hub-signature-256` using `WHATSAPP_APP_SECRET` before accepting events.

For local development, Meta cannot call `http://localhost:3000`. Use an HTTPS tunnel such as ngrok and give Meta a URL like:

```text
https://YOUR-TUNNEL-DOMAIN.ngrok-free.app/api/whatsapp/webhook
```

After the project is deployed to Vercel, replace the tunnel URL with the Vercel URL.

## Production checklist

- Use the Neon PostgreSQL `DATABASE_URL` in Vercel Environment Variables.
- Set `NEXTAUTH_URL` to the deployed Vercel domain and a strong `NEXTAUTH_SECRET`.
- Set `DATA_ENCRYPTION_KEY` and `DATA_HASH_SECRET` to stable production secrets. Do not rotate them casually because existing encrypted customer data depends on them.
- Set Razorpay production keys/webhook secret if online payments are enabled.
- Set the WhatsApp Cloud API variables if WhatsApp OTP/order updates are enabled.
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Google sign-in. Add `/api/auth/callback/google` as an authorized redirect URI in Google Cloud Console for both localhost and the production domain.
- Vercel uses `vercel.json` to run `prisma migrate deploy` before the Next.js build.
- Run `npm run prisma:seed` once against the production Neon database to create/update the admin account after setting the admin environment variables.

### Customer data behavior

- Password accounts require verified Indian mobile numbers.
- Google accounts can be created without a password/phone; cash checkout still requires OTP verification of the checkout phone.
- Orders are associated with the authenticated user when signed in.
- Profile order counts and loyalty rewards are calculated from the user's real database orders, not hard-coded UI values.
- Favorites are persisted in PostgreSQL for signed-in customers and remain local-device favorites for guests.
