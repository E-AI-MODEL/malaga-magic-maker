# Vakansie

Vakansie is a mobile-first vacation preparation app that helps one person or a group organize a trip from booking and planning through departure.

The AI assistant is called Hansie. Hansie is intended to understand the current trip and help users see what is booked, what is missing, what still needs action, and whether they are ready to leave.

## Product direction

The commercial Vakansie product must support:

- solo travelers and groups
- multiple trips per account
- any destination and vacation type
- secure trip membership and invitations
- a chronological travel/booking timeline
- tasks, decisions and expenses
- private trip documents
- contextual assistance from Hansie

The target signed-in information architecture is:

- Home
- Reis
- Samen
- Hansie available contextually throughout the trip

The repository still contains legacy prototype code from an earlier single-trip Malaga golf use case. That data and those assumptions are not product requirements. See `AGENTS.md` for the engineering contract that governs new work.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Vitest

## Local development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run quality checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Environment variables

Local environment configuration belongs in untracked `.env` files. Do not commit secrets or service-role credentials.

Use the existing Lovable/Supabase project configuration and provide local values through your environment. Public browser configuration such as Supabase project URL and publishable/anon keys may be required by the frontend, while privileged service-role keys must remain server-side only.

## Database changes

Supabase migrations are forward-only. Do not edit migrations that may already have been applied. Create a new migration for schema or RLS changes and keep generated Supabase TypeScript types synchronized.

## Security model

Vakansie is multi-tenant. Every trip-owned record must be protected by trip membership. Client-side filtering is not an authorization boundary. Any edge function using a Supabase service-role key must verify the authenticated user's trip authorization before reading private trip data.

Private tickets, booking confirmations, vouchers and other trip documents must not be placed in public storage buckets.

## Repository guidance

Read `AGENTS.md` before making product or architecture changes. New generic product code must not depend on fixed Malaga, golf, participant, date, accommodation or group assumptions from the legacy prototype.