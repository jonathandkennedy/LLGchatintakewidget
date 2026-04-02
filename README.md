# IntakeLLG Widget App

Initialized Next.js repo with compile-safe placeholder implementations for:
- embeddable guided intake widget
- public widget APIs
- lead/session persistence via Supabase
- Telnyx voice + messaging webhook scaffolding
- routing rules and callback fallback flows

## Quick start

1. Copy `.env.example` to `.env.local`
2. Add Supabase and Telnyx credentials
3. Run your Supabase migration in `supabase/migrations/001_init.sql`
4. Install packages and start the app

```bash
npm install
npm run dev
```

## Important notes

- Telnyx webhook verification is still a safe placeholder and must be replaced with the exact current Telnyx signature validation flow before production use.
- Voice connect logic is scaffolded around a simple outbound call creation pattern and needs final call-control / bridge logic based on your chosen Telnyx implementation.
- The widget renderer is intentionally simple and compile-safe so Claude Code can extend it quickly.

## Production-ready v1 patch pack additions

This patched repo adds:
- iframe-mounted widget host at `/widget/[clientSlug]`
- public embed script that launches a real iframe widget
- DB-configured branching in `/api/widget/session/answer`
- Telnyx call attempt + SMS fallback scaffolding
- admin lead inbox, lead detail page, and lead status updates
