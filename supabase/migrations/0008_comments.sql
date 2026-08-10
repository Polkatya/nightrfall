-- ---------------------------------------------------------
-- COMMENTS
-- ---------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index idx_comments_profile_id on public.comments(profile_id);
create index idx_comments_user_id on public.comments(user_id);

alter table public.comments enable row level security;

-- anyone can read comments on a profile they're allowed to view; the
-- profile page itself already gates access to the profile, comments just
-- follow the same "active, or owner" rule.
create policy "comments_select_visible"
  on public.comments for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = comments.profile_id
        and (p.status = 'active' or p.user_id = auth.uid())
    )
  );

create policy "comments_insert_own"
  on public.comments for insert
  with check (
    auth.uid() = user_id
    and not exists (select 1 from public.users u where u.id = auth.uid() and u.is_banned)
  );

-- a comment can be removed by whoever wrote it, or by an admin moderating.
create policy "comments_delete_own_or_admin"
  on public.comments for delete
  using (auth.uid() = user_id or public.is_admin());

-- surface a comment count alongside the other feed stats. New columns in a
-- "create or replace view" must go at the end — Postgres won't let you
-- reorder or insert a column before existing ones, only append.
create or replace view public.profiles_with_stats as
select
  p.*,
  coalesce(l.like_count, 0) as like_count,
  coalesce(d.dislike_count, 0) as dislike_count,
  coalesce(l.like_count, 0) as reaction_count, -- kept for backward compatibility
  coalesce(m.media_count, 0) as media_count,
  (p.featured_until is not null and p.featured_until > now()) as is_featured,
  coalesce(c.comment_count, 0) as comment_count
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
) m on m.profile_id = p.id
left join (
  select profile_id, count(*) as comment_count
  from public.comments
  group by profile_id
) c on c.profile_id = p.id;
