-- =========================================================
-- Raise the per-user profile limit from 1 to 3.
-- =========================================================

-- the old constraint only ever allowed a single non-deleted profile per user
drop index if exists idx_profiles_one_active_per_user;

-- enforce "up to 3" via a trigger instead, with a friendly message the
-- client can detect and show instead of a raw Postgres error
create or replace function public.enforce_profile_limit()
returns trigger language plpgsql as $$
declare
  existing_count int;
begin
  select count(*) into existing_count
  from public.profiles
  where user_id = new.user_id and status <> 'deleted';

  if existing_count >= 3 then
    raise exception 'PROFILE_LIMIT_REACHED'
      using detail = 'You can have up to 3 profiles. Delete an old one from My Profiles first.';
  end if;

  return new;
end;
$$;

create trigger trg_profiles_enforce_limit
  before insert on public.profiles
  for each row execute function public.enforce_profile_limit();
