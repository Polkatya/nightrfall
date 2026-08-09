-- =========================================================
-- Profile media gallery — up to 10 photos/videos per profile
-- =========================================================

create table public.profile_media (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index idx_profile_media_profile_id on public.profile_media(profile_id);
create unique index idx_profile_media_position on public.profile_media(profile_id, position);

alter table public.profile_media enable row level security;

create policy "profile_media_select_public"
  on public.profile_media for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id
        and (p.status = 'active' or p.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "profile_media_insert_own"
  on public.profile_media for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "profile_media_delete_own_or_admin"
  on public.profile_media for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and (p.user_id = auth.uid() or public.is_admin())
    )
  );

-- Hard cap of 10 items per profile, enforced in the database (not just the UI).
create or replace function public.check_profile_media_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.profile_media where profile_id = new.profile_id) >= 10 then
    raise exception 'A profile can have at most 10 photos/videos';
  end if;
  return new;
end;
$$;

create trigger trg_profile_media_limit
  before insert on public.profile_media
  for each row execute function public.check_profile_media_limit();

-- Allow video uploads (and bump the size limit for them) in the existing bucket.
update storage.buckets
set file_size_limit = 52428800, -- 50MB, to fit short video clips
    allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp','video/mp4','video/webm']
where id = 'profile-images';

-- Add a media count to the feed view so cards can show a small "gallery" badge.
create or replace view public.profiles_with_stats as
select
  p.*,
  coalesce(r.reaction_count, 0) as reaction_count,
  coalesce(m.media_count, 0) as media_count,
  (p.featured_until is not null and p.featured_until > now()) as is_featured
from public.profiles p
left join (
  select profile_id, count(*) as reaction_count
  from public.reactions
  group by profile_id
) r on r.profile_id = p.id
left join (
  select profile_id, count(*) as media_count
  from public.profile_media
  group by profile_id
) m on m.profile_id = p.id;
