# Oat & Ember Café — Responsive Gen-Z Takeaway App

A production-minded Next.js 14 café ordering experience with a neo-editorial coffee aesthetic, mobile-first navigation, vehicle curbside pickup, corporate/office handover, customer authentication, Razorpay/Cash checkout, email receipts, Prisma/SQLite, and a live admin operations board.

## Stack

- Next.js 14 App Router + TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Zustand
- Prisma + SQLite
- NextAuth Credentials
- Razorpay
- Nodemailer SMTP receipts

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The `predev` script syncs the SQLite schema and runs the seed automatically.

## Admin

- Email: `admin@cafe.com`
- Phone: `9999999999`
- Password: `admin123`
- Dashboard: `http://localhost:3000/admin`

## Mobile testing on the same Wi-Fi

Use Windows Command Prompt or `npm.cmd` from PowerShell:

```bash
npm.cmd run dev -- -H 0.0.0.0
```

Then find your PC IPv4 address with:

```bash
ipconfig
```

On the phone, open:

```text
http://YOUR-PC-IP:3000
```

Example: `http://192.168.29.198:3000`.

The redesigned site includes a dedicated mobile bottom navigation with Home, Menu, Bag, Login/Account and Pickup/Ops access, so the login option is visible on small screens.

## Email receipts

Add SMTP settings to `.env` when you want real receipt delivery:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-cafe-email@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_FROM="Oat & Ember Café <your-cafe-email@gmail.com>"
```

For Gmail, use a Google App Password rather than your normal Gmail password.

## Razorpay

Add test credentials to `.env`:

```env
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

Cash checkout works without Razorpay credentials.

## Design update

This edition is mobile-first and responsive across phones, tablets and desktop screens. The customer experience was redesigned around a bold coffee-zine/editorial visual system:

- oversized kinetic hero typography
- cream menu editorial section
- terracotta/matcha accent system
- mobile bottom navigation
- responsive cart checkout
- full-screen mobile handover studio
- improved login/register screens
- responsive admin operations board
- horizontal admin workflow lanes on smaller screens
- touch-friendly controls and safe-area spacing

## Order notifications

The app now includes live order operations notifications:
- Admin receives an instant in-dashboard SSE alert and notification sound when a new order is created.
- If SMTP is configured, the café owner also receives a new-order email via `ADMIN_NOTIFICATION_EMAIL`.
- Customers receive a receipt email when SMTP is configured.
- When the owner moves an order to BREWING, PACKED, or COMPLETED, the customer receives a status email.
- Each order gets a private tracking token and a live tracker at `/order/<tracking-token>`.
- The tracker polls every four seconds so customers can see the current status without refreshing.

For local development, SSE is used for the admin dashboard. For a multi-instance production deployment, use a shared event broker (for example Redis/Pusher/Ably) instead of an in-memory event bus.
