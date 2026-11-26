# Stayora HMS

A multi-tenant hotel management suite for modern hotels, resorts and hospitality groups. Each
workspace gets its own rooms, guests, reservations, staff, finance and branding, with plan-based
entitlements and an add-on marketplace.

## What's inside

- **Operations** — reservations, booking desk, rooms & halls, guests, housekeeping, maintenance,
  kitchen display, laundry, spa & gym, events & venues
- **Revenue** — payments, accounting, billing & invoices, booking channels, reports & analytics,
  restaurant & bar POS
- **Growth** — CRM & marketing, loyalty, WhatsApp agent, optional online booking system
- **People** — HR & attendance, attendance clock, payroll & staff, roles & permissions
- **Supplies** — inventory, procurement, transport, documents
- **Platform** — subscription & billing, integrations & API, security & audit, AI studio,
  properties & config, tenant console, subscription control

## Plans, add-ons and branding

- Three plans: Free, Starter and Professional, with room, staff and property limits.
- Add-on marketplace for capacity and features, including the paid **Online booking system**
  add-on. The public booking site stays hidden until that add-on is active.
- Per-workspace accent colour with contrast-safe presets and a custom colour picker. The choice is
  stored on the tenant and applied across the suite and the public booking page.

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS v4, React Router. State is persisted locally
(`localStorage`) so the demo runs without a backend.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

Build for production:

```bash
npm run build
```

## Demo workspaces

| Workspace | Plan | Sign in |
| --- | --- | --- |
| Stayora Lagos | Professional | `admin@stayora.ng` |
| Stayora Abuja | Starter | `manager@stayora.ng` |
| Zuri Nairobi | Free | `ada.obi@zurihouse.co.ke` |

Password for all demo accounts: `stayora`.
