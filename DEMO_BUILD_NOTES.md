# Oat & Ember — Surat Café Demo Build

This build is designed as a premium, mobile-first takeaway café demo that can later be white-labelled for a real café client.

## Customer experience
- Takeaway-first homepage with a restrained menu preview
- Full searchable menu with category chips
- Product-specific customisation; no forced small/large sizing
- "Help me choose" craving discovery
- Mobile bottom navigation with dedicated bag action
- Demo OTP mode; no WhatsApp API required for the demo
- Cart + takeaway handover + online/cash checkout
- Order tracking and order history
- Branded receipt with Save as PDF / Print flow
- Receipt available again from order history
- Reorder, favorites, rewards, offers and profile
- Separate editorial Our Story page
- Responsive layouts for mobile, tablet and desktop

## Admin experience
- Live takeaway order lanes: New → Preparing → Ready → Completed
- Revenue, order volume and top-seller overview
- Menu availability / 86-item controls
- Secondary panels for customers, loyalty, offers, analytics, reviews, QR ordering, staff and settings
- Mobile-safe cards and tablet/desktop operations layout

## White-label direction
The demo brand is Oat & Ember. For a real café client, replace the café identity, logo, colours, story, menu, location, hours and business integrations without changing the product architecture.

## Demo OTP
`.env.local` should contain:

`DEMO_OTP_MODE="true"`

When the client is ready, switch to the production OTP provider and set demo mode to false.
