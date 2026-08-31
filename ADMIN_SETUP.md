# Oat & Ember admin setup

The admin console is database-backed. It is not a static mock.

## First run

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `NEXTAUTH_SECRET`, `DATA_HASH_SECRET`, `DATA_ENCRYPTION_KEY`, `ADMIN_EMAIL`, `ADMIN_PHONE`, and `ADMIN_PASSWORD`.
2. Run `npm install`.
3. Run `npm run db:setup`.
4. Run `npm run build`.
5. Run `npm run dev`.
6. Open `/login` and sign in with the admin email, phone and password.

## Admin behavior

- Dashboard revenue is calculated from completed orders. Cash orders become `PAID` when the admin completes them, so completed cash sales are included in revenue.
- New orders can be accepted or rejected directly from the dashboard.
- Orders has a separate searchable history with status, payment, fulfilment and item details.
- Menu supports add, edit, availability and persistence.
- Customers lists every customer with order history and spend.
- Loyalty derives points from completed spend (1 point per ₹10).
- Offers, staff, settings and QR entries are stored in PostgreSQL.
- Analytics is calculated from actual order items, payment methods and customers.
