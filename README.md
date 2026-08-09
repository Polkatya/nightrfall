# Nightfall — Community Platform

A standalone 18+ community profile platform. Next.js (App Router) + TypeScript +
Tailwind CSS + Supabase (Postgres, Auth, Storage). No Discord integration of any kind.

## Project structure

```
community-app/
├── app/
│   ├── page.tsx                    Homepage / feed
│   ├── layout.tsx                  Root layout, header, toaster
│   ├── globals.css
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── create/page.tsx             Create profile (protected)
│   ├── profile/[username]/page.tsx Profile detail page
│   ├── rules/page.tsx
│   ├── admin/
│   │   ├── page.tsx                Admin dashboard (server, protected)
│   │   └── AdminDashboardClient.tsx
│   └── api/
│       ├── reports/route.ts        POST — submit a report (rate-limited)
│       └── admin/actions/route.ts  POST — privileged moderation actions
├── components/
│   ├── Header.tsx / HeaderAuthMenu.tsx
│   ├── ProfileCard.tsx
│   ├── ReactionButton.tsx          Optimistic heart reactions
│   ├── ReportModal.tsx
│   ├── CountdownTimer.tsx          Featured countdown
│   ├── FilterBar.tsx               Latest / Popular / Ending Soon
│   └── FeedStates.tsx              Skeleton + empty states
├── lib/supabase/
│   ├── client.ts                   Browser Supabase client
│   └── server.ts                   Server client + admin (service role) client
├── middleware.ts                   Session refresh + route protection
├── types/database.ts
├── supabase/migrations/0001_init.sql   Full schema, RLS, storage policies
└── .env.example
```

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to the browser)

## 2. Run the database migration

Option A — Supabase SQL Editor:
1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the full contents of `supabase/migrations/0001_init.sql`.
3. Run it. This creates all tables, indexes, constraints, RLS policies,
   the `profile-images` storage bucket with its policies, and the
   `profiles_with_stats` view used by the feed.

Option B — Supabase CLI:
```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

## 3. Promote your first admin

Sign up through the app once, then in the SQL Editor run:

```sql
update public.users set role = 'admin' where username = 'your-username';
```

There is intentionally no self-service way to become admin from the UI.

## 4. Local setup

```bash
cp .env.example .env.local
# fill in the three Supabase values

npm install
npm run dev
```

App runs at http://localhost:3000.

## 5. How the moving parts work

- **Auth**: Supabase email/password auth. A trigger (`handle_new_user`) creates
  a matching row in `public.users` on signup. Sessions are cookie-based via
  `@supabase/ssr` and refreshed in `middleware.ts`.
- **Authorization**: All authorization is enforced server-side — Postgres RLS
  policies for direct table access, plus explicit checks in the two API routes
  (`/api/reports`, `/api/admin/actions`) that resolve the user from the
  server-side session cookie, never from a client-supplied ID.
- **Reactions**: A unique constraint on `(profile_id, user_id, reaction_type)`
  prevents duplicate hearts. The `ReactionButton` updates optimistically and
  writes directly to Supabase from the browser (covered by RLS), so no full
  page reload is needed.
- **Featured timer**: `profiles.featured_until` is a timestamp. The `is_featured`
  flag is computed server-side in the `profiles_with_stats` view
  (`featured_until > now()`), so it's never trusted from the client, and it
  naturally flips to `false` after expiry without deleting the row.
- **Image upload**: Client validates MIME type and 5MB size before upload;
  storage bucket policies additionally enforce `allowed_mime_types` and
  `file_size_limit` server-side. Files are stored under `{user_id}/{uuid}.ext`,
  and storage RLS policies only allow a user to write inside their own folder.
- **Admin actions**: `/api/admin/actions` re-verifies the caller's role from
  the server session before using the service-role client, and writes every
  action to `moderation_logs`.

## 6. Build & verify

```bash
npm run build
```

This will surface any TypeScript or import errors — fix them before deploying.

## 7. Deployment (Vercel)

1. Push this repository to GitHub.
2. Import it in Vercel.
3. Add the three environment variables from `.env.example` in
   **Project Settings → Environment Variables**.
4. Deploy. Vercel runs `npm run build` automatically.
5. In Supabase **Authentication → URL Configuration**, add your deployed
   domain to Site URL / Redirect URLs.

## Notes / production hardening

- The in-memory rate limiter in `/api/reports` is per server instance —
  fine for a single deployment, but swap it for a durable store (e.g.
  Upstash Redis) once you're on multiple serverless instances.
- Consider adding Supabase's built-in email confirmation requirement
  (Authentication → Providers → Email → "Confirm email") so unverified
  accounts can't publish profiles.
- Consider a scheduled Supabase Edge Function to periodically sweep
  expired-but-still-flagged content if you add auto-hide-on-N-reports logic.
