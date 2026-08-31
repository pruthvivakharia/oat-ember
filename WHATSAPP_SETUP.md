# Oat & Ember — WhatsApp Cloud API setup

## Current state

The project already contains server-side WhatsApp sending logic. The integration has been separated into two jobs:

1. Customer notifications (OTP + order status)
2. Café-owner new-order notifications

The temporary Meta test number can be used for the owner destination by setting `WHATSAPP_OWNER_PHONE` to a recipient that Meta has allowed for the test number.

## Environment variables

```text
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_GRAPH_VERSION=v25.0
WHATSAPP_TEMPLATE_LANGUAGE=en_US
WHATSAPP_OTP_TEMPLATE=
WHATSAPP_ORDER_ACCEPTED_TEMPLATE=
WHATSAPP_ORDER_PREPARED_TEMPLATE=
WHATSAPP_ORDER_READY_TEMPLATE=
WHATSAPP_OWNER_PHONE=
WHATSAPP_OWNER_ORDER_TEMPLATE=
WHATSAPP_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

Do not commit `.env.local`.

## Important template rule

Use the exact approved template names from WhatsApp Manager. Do not assume that a template displayed as a friendly label such as `Order Confirmation` has the same internal name or the same number of body parameters.

## Webhook

The webhook route is:

`/api/whatsapp/webhook`

Meta's verification request must receive the exact `hub.challenge` when `hub.mode=subscribe` and the verify token matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

Incoming POST requests are accepted only when the `x-hub-signature-256` HMAC matches the raw request body and `WHATSAPP_APP_SECRET`.

## Local testing

1. Start the Next.js app on port 3000.
2. Start an HTTPS tunnel to port 3000.
3. Put the tunnel URL plus `/api/whatsapp/webhook` into Meta's webhook callback URL.
4. Enter the same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in Meta.
5. Subscribe the WhatsApp Business Account to the `messages` field.
6. Send a WhatsApp message to the test/business number.
7. Confirm the POST arrives at `/api/whatsapp/webhook`.

## Production handover

When the café owner accepts the project:

1. Create/prepare the owner's Meta Business/WABA assets.
2. Register and verify the owner's business phone number in WhatsApp Manager.
3. Generate a production system-user access token with the required WhatsApp permissions.
4. Put the owner's phone number ID and token into the production environment only.
5. Create/approve the owner order-notification template.
6. Set `WHATSAPP_OWNER_PHONE` to the owner's number.
7. Set `WHATSAPP_OWNER_ORDER_TEMPLATE` to the exact approved template name.
8. Deploy to Vercel and set the same server-side environment variables there.
9. Point Meta's webhook callback to `https://YOUR-DOMAIN/api/whatsapp/webhook`.
