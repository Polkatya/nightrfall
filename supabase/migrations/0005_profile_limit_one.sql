-- =========================================================
-- Lower the per-user profile limit back down to 1.
-- =========================================================

create or replace function public.enforce_profile_limit()
returns trigger language plpgsql as $$
declare
  existing_count int;
begin
  select count(*) into existing_count
  from public.profiles
  where user_id = new.user_id and status <> 'deleted';

  if existing_count >= 1 then
    raise exception 'PROFILE_LIMIT_REACHED'
      using detail = 'You already have a profile. Delete it from My Profiles first if you want to create a new one.';
  end if;

  return new;
end;
$$;

-- trg_profiles_enforce_limit already points at this function (created in
-- 0004), so no need to touch the trigger itself.
