-- =========================================================
-- Profile stats: impressions (feed appearances), views (opens),
-- and dislikes (reactions become like/dislike, mutually exclusive).
-- =========================================================

-- ---------------------------------------------------------
-- Counters on profiles
-- ---------------------------------------------------------
alter table public.profiles add column impression_count integer not null default 0;
alter table public.profiles add column view_count integer not null default 0;

-- ---------------------------------------------------------
-- Reactions: rename 'heart' -> 'like', add 'dislike',
-- and make one reaction per user per profile (was per type).
-- ---------------------------------------------------------
update public.reactions set reaction_type = 'like' where reaction_type = 'heart';

alter table public.reactions drop constraint reactions_reaction_type_check;
alter table public.reactions add constraint reactions_reaction_type_check
  check (reaction_type in ('like', 'dislike'));

alter table public.reactions drop constraint reactions_profile_id_user_id_reaction_type_key;
alter table public.reactions add constraint reactions_profile_id_user_id_key
  unique (profile_id, user_id);

alter table public.reactions alter column reaction_type set default 'like';

-- allow switching between like/dislike (upsert / update own reaction)
create policy "reactions_update_own"
  on public.reactions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and not exists (select 1 from public.users u where u.id = auth.uid() and u.is_banned)
  );

-- ---------------------------------------------------------
-- Impression / view counters, callable by anon + authenticated.
-- security definer since profiles_update_own_or_admin normally
-- restricts updates to the profile owner.
-- ---------------------------------------------------------
create or replace function public.increment_profile_impressions(p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set impression_count = impression_count + 1
  where id = any(p_ids) and status = 'active';
end;
$$;

create or replace function public.increment_profile_view(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set view_count = view_count + 1
  where id = p_id and status = 'active';
end;
$$;

grant execute on function public.increment_profile_impressions(uuid[]) to anon, authenticated;
grant execute on function public.increment_profile_view(uuid) to anon, authenticated;

-- ---------------------------------------------------------
-- Feed view: split reaction_count into like_count/dislike_count
-- and surface the new counters.
-- ---------------------------------------------------------
drop view if exists public.profiles_with_stats;

create view public.profiles_with_stats as
select
  p.*,
  coalesce(l.like_count, 0) as like_count,
  coalesce(d.dislike_count, 0) as dislike_count,
  coalesce(l.like_count, 0) as reaction_count, -- kept for backward compatibility
  coalesce(m.media_count, 0) as media_count,
  (p.featured_until is not null and p.featured_until > now()) as is_featured
from public.profiles p
left join (
  select profile_id, count(*) as like_count
  from public.reactions
  where reaction_type = 'like'
  group by profile_id
) l on l.profile_id = p.id
left join (
  select profile_id, count(*) as dislike_count
  from public.reactions
  where reaction_type = 'dislike'
  group by profile_id
) d on d.profile_id = p.id
left join (
  select profile_id, count(*) as media_count
  from public.profile_media
  group by profile_id
) m on m.profile_id = p.id;
