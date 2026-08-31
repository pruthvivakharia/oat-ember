# Oat & Ember — Admin Operations Upgrade

This package keeps the existing customer ordering/auth/payment flow and replaces the placeholder admin console with database-backed operations.

## Admin now includes

- **Dashboard:** real revenue, today's orders, completed orders, active tickets, accept/reject controls, preparation flow and recent completed sales.
- **Orders:** a dedicated searchable order-history screen with customer, items, payment, fulfilment, status and action controls.
- **Menu:** add, edit, price/description/image changes, and availability toggle; all persisted to PostgreSQL.
- **Customers:** every customer who has ordered, with contact details, spend, order count and expandable order history.
- **Loyalty:** real customer ledger; 1 point per ₹10 on completed orders.
- **Offers:** live/paused offers, coupon codes, start/end dates, percentage or flat discounts, add/delete controls.
- **Analytics:** item sales/revenue, payment-method performance, top customers and operational KPIs.
- **Reviews:** real testimonials from the database.
- **QR ordering:** database-backed counter/table QR entries with active/disabled state and unique tokens.
- **Staff:** staff directory with role, phone, email, shift and active state.
- **Settings:** café identity, contact information, address, opening hours, tax, lead time and integration switches.

## Revenue fix

Completed orders are now treated as sales. When a cash order is marked **COMPLETED**, its payment status is changed from `CASH_DUE` to `PAID`, so completed cash sales appear in revenue. This fixes the previous `₹0` revenue problem for completed cash orders.

## First run after replacing the project

```powershell
npm install
npm run db:setup
npm run build
npm run dev
```

`db:setup` deploys the committed Prisma migrations and then runs the idempotent seed.

## Admin login

Use the `ADMIN_EMAIL`, `ADMIN_PHONE`, and `ADMIN_PASSWORD` values configured in `.env.local`. The ZIP does not include secrets.

## Important

Do not delete your existing `.env.local`. The application needs the same database and encryption/hash secrets that were used for the existing customer/order data.
