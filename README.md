## Arena Starter

Simple starter with:
- Next.js (App Router + TypeScript)
- Supabase client setup
- Tailwind CSS
- Reusable MUI component pattern
- TanStack Table example

## Setup

1. Install dependencies (already done if you used this repo directly):
`npm install`

2. Set environment variables:
`cp .env.example .env.local`

3. Fill `.env.local` values from your Supabase project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Run the app:
`npm run dev`

5. Start local PvP WebSocket server (separate terminal):
`npm run ws:dev`

Open `http://localhost:3000`.

## Key Files

- Supabase client: `src/lib/supabase/client.ts`
- Reusable MUI component: `src/components/ui/app-button.tsx`
- TanStack table component: `src/components/table/sample-users-table.tsx`
- Home page example: `src/app/page.tsx`

## Scripts

- `npm run dev` start development server
- `npm run lint` run ESLint
- `npm run build` build for production
- `npm run ws:dev` run local in-memory PvP WebSocket server
