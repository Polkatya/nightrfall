-- ---------------------------------------------------------
-- Real auto-deletion: the "duration" picked at creation time
-- (stored in featured_until) used to only affect "featured"
-- placement. Now it's also the profile's actual lifetime —
-- once it passes, the profile is soft-deleted (status set to
-- 'deleted', same as an admin manually deleting it), the same
-- way app/api/admin/actions/route.ts does it.
-- ---------------------------------------------------------

create extension if not exists pg_cron with schema extensions;

create or replace function public.expire_profiles() returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set status = 'deleted'
  where status = 'active'
    and featured_until is not null
    and featured_until < now();
$$;

-- Runs every minute. If this fails to schedule (permission error), enable
-- the pg_cron extension for this project from the Supabase dashboard under
-- Database -> Extensions, then re-run this migration.
select cron.schedule(
  'expire-profiles',
  '* * * * *',
  $$ select public.expire_profiles(); $$
);
