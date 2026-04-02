# IntakeLLG — Website Intake Widget + Admin Dashboard

A hosted Next.js + Supabase application that embeds a guided intake widget on law firm websites. Visitors answer a short conditional-logic intake flow, the system captures the lead, and attempts to connect them to the firm by phone using a local Telnyx tracking number.

## Stack

- **Frontend/Admin:** Next.js 14 App Router + TypeScript
- **Database/Auth:** Supabase (Postgres)
- **Telephony:** Telnyx (voice + SMS)
- **Hosting:** Vercel
- **Styling:** Custom CSS (no Tailwind dependency)

## Quick Start

### 1. Prerequisites
- Node.js 18+
- A Supabase project (free tier works for testing)
- A Telnyx account (for telephony — optional for initial UI testing)

### 2. Clone and install
```bash
git clone https://github.com/jonathandkennedy/LLGchatintakewidget.git
cd LLGchatintakewidget
npm install
```

### 3. Environment setup
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service role key (keep secret)

### 4. Database setup
Run these SQL files in your Supabase SQL editor, in order:
1. `supabase/migrations/001_init.sql` — creates all tables
2. `supabase/seed.sql` — creates a demo client with full intake flow

### 5. Run locally
```bash
npm run dev
```

Visit:
- **Home:** http://localhost:3000
- **Widget demo (no DB needed):** http://localhost:3000/widget-demo
- **Widget with DB:** http://localhost:3000/widget/demo-law-firm
- **Admin dashboard:** http://localhost:3000/admin
- **Admin leads:** http://localhost:3000/admin/leads

### 6. Telnyx setup (when ready)
Fill in the Telnyx env vars:
- `TELNYX_API_KEY`
- `TELNYX_DEFAULT_CONNECTION_ID`
- `TELNYX_DEFAULT_MESSAGING_PROFILE_ID`

Update the demo phone number in `client_phone_numbers` table with your real Telnyx number, and update the routing rule destination number.

Set Telnyx webhook URLs:
- Voice: `https://your-domain.com/api/providers/telnyx/voice/webhook`
- Messaging: `https://your-domain.com/api/providers/telnyx/messaging/webhook`

## Project Structure

```
src/
├── app/
│   ├── admin/              # Admin dashboard pages
│   │   ├── layout.tsx      # Sidebar navigation
│   │   ├── page.tsx        # Dashboard with KPIs
│   │   ├── leads/          # Lead list + detail
│   │   ├── clients/        # Client management
│   │   ├── analytics/      # Funnel analytics
│   │   ├── flow-editor/    # Intake flow editor
│   │   ├── routing/        # Phone numbers + routing rules
│   │   ├── branding/       # Widget branding per client
│   │   └── install/        # Embed script generator
│   ├── api/
│   │   ├── widget/         # Public widget APIs
│   │   ├── admin/          # Admin APIs
│   │   └── providers/      # Telnyx webhooks
│   ├── widget/[clientSlug] # Widget iframe host
│   └── widget-demo/        # Static demo (no DB)
├── components/widget/      # Widget UI components
├── lib/
│   ├── widget/             # Flow engine, config, session, validation
│   ├── telnyx/             # Telnyx client, voice, messaging, verify
│   ├── routing/            # Schedule-based routing resolver
│   ├── supabase/           # Supabase admin client
│   ├── constants/          # US states, etc.
│   └── utils/              # Env, phone, JSON helpers
├── types/                  # TypeScript types
└── supabase/
    ├── migrations/         # Database schema
    └── seed.sql            # Demo data
```

## Admin Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/admin` | KPI summary, recent leads |
| Leads | `/admin/leads` | Search, filter, view all leads |
| Lead Detail | `/admin/leads/[id]` | Answers, calls, SMS, status update |
| Clients | `/admin/clients` | Create and manage law firm clients |
| Analytics | `/admin/analytics` | Funnel metrics, top pages, top sources |
| Flow Editor | `/admin/flow-editor` | Edit intake questions and branch logic |
| Routing | `/admin/routing` | Phone numbers, forwarding rules, fallback settings |
| Branding | `/admin/branding` | Colors, text, logos, legal links |
| Install | `/admin/install` | Embed script for each client |

## Widget Embed

Paste on any website before `</body>`:
```html
<script
  src="https://your-domain.com/embed/widget.js"
  data-client-slug="demo-law-firm"
  data-api-base="https://your-domain.com"
  defer
></script>
```

## What's Production-Ready vs. Placeholder

### Production-ready
- Database schema and seed data
- Widget flow engine with conditional branching
- Session/lead persistence with attribution tracking
- All admin pages (dashboard, leads, clients, analytics, flow editor, routing, branding, install)
- Widget runtime with full intake flow
- Telnyx voice call initiation + SMS fallback
- Webhook handlers for voice and messaging
- Schedule-based routing resolver

### Needs attention before production
- **Telnyx webhook verification** — currently returns `true` (placeholder). Replace with real ed25519 signature verification.
- **Admin auth** — no authentication gate on admin routes. Add Supabase Auth before exposing publicly.
- **Call bridge logic** — scaffolded as simple outbound call. May need Telnyx call-control bridge commands depending on your flow.
- **Widget UI polish** — functional and clean but can be further refined for premium feel.

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set all environment variables from `.env.example`
4. Deploy
5. Update Telnyx webhook URLs to point to your Vercel domain
6. Run seed SQL if not already done

## License

Private — IntakeLLG internal use.
