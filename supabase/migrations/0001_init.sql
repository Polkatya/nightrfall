-- =========================================================
-- Community Platform — initial schema
-- =========================================================
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- USERS (extends Supabase auth.users)
-- ---------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  role text not null default 'user' check (role in ('user', 'admin')),
  is_banned boolean not null default false,
  banned_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_role on public.users(role);
create index idx_users_username on public.users(username);

-- ---------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 32),
  bio text check (char_length(bio) <= 500),
  image_path text not null,
  tags text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'hidden', 'deleted')),
  featured_until timestamptz,
  age_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_user_id on public.profiles(user_id);
create index idx_profiles_status on public.profiles(status);
create index idx_profiles_featured_until on public.profiles(featured_until);
create index idx_profiles_created_at on public.profiles(created_at desc);
create index idx_profiles_tags on public.profiles using gin(tags);

-- one active profile per user
create unique index idx_profiles_one_active_per_user
  on public.profiles(user_id)
  where status <> 'deleted';

-- ---------------------------------------------------------
-- REACTIONS
-- ---------------------------------------------------------
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction_type text not null default 'heart' check (reaction_type in ('heart')),
  created_at timestamptz not null default now(),
  unique (profile_id, user_id, reaction_type)
);

create index idx_reactions_profile_id on public.reactions(profile_id);
create index idx_reactions_user_id on public.reactions(user_id);

-- ---------------------------------------------------------
-- REPORTS
-- ---------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  reason text not null check (reason in
    ('inappropriate_content', 'underage', 'impersonation', 'harassment', 'spam', 'other')),
  description text check (char_length(description) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id)
);

create index idx_reports_profile_id on public.reports(profile_id);
create index idx_reports_status on public.reports(status);
create index idx_reports_reason on public.reports(reason);

-- ---------------------------------------------------------
-- MODERATION LOGS
-- ---------------------------------------------------------
create table public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users(id),
  action text not null check (action in
    ('hide_profile', 'restore_profile', 'delete_profile', 'ban_user', 'unban_user', 'resolve_report', 'dismiss_report')),
  target_type text not null check (target_type in ('profile', 'user', 'report')),
  target_id uuid not null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_moderation_logs_admin_id on public.moderation_logs(admin_id);
create index idx_moderation_logs_target on public.moderation_logs(target_type, target_id);

-- =========================================================
-- updated_at triggers
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================
-- auto-create public.users row on signup
-- =========================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)));
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- helper: is current user an admin
-- =========================================================
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.reactions enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_logs enable row level security;

-- USERS -----------------------------------------------------
create policy "users_select_own_or_admin"
  on public.users for select
  using (auth.uid() = id or public.is_admin());

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- PROFILES ----------------------------------------------------
create policy "profiles_select_public"
  on public.profiles for select
  using (status = 'active' or user_id = auth.uid() or public.is_admin());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (
    auth.uid() = user_id
    and age_confirmed = true
    and not exists (select 1 from public.users u where u.id = auth.uid() and u.is_banned)
  );

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "profiles_delete_own_or_admin"
  on public.profiles for delete
  using (user_id = auth.uid() or public.is_admin());

-- REACTIONS ----------------------------------------------------
create policy "reactions_select_all"
  on public.reactions for select
  using (true);

create policy "reactions_insert_own"
  on public.reactions for insert
  with check (
    auth.uid() = user_id
    and not exists (select 1 from public.users u where u.id = auth.uid() and u.is_banned)
  );

create policy "reactions_delete_own"
  on public.reactions for delete
  using (auth.uid() = user_id);

-- REPORTS ----------------------------------------------------
create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "reports_select_own_or_admin"
  on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());

create policy "reports_update_admin_only"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- MODERATION LOGS ----------------------------------------------------
create policy "moderation_logs_select_admin_only"
  on public.moderation_logs for select
  using (public.is_admin());

create policy "moderation_logs_insert_admin_only"
  on public.moderation_logs for insert
  with check (public.is_admin());

-- =========================================================
-- Storage bucket + policies (profile-images)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 5242880, array['image/jpeg','image/jpg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "profile_images_public_read"
  on storage.objects for select
  using (bucket_id = 'profile-images');

create policy "profile_images_own_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "profile_images_own_update"
  on storage.objects for update
  using (
    bucket_id = 'profile-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "profile_images_own_delete"
  on storage.objects for delete
  using (
    bucket_id = 'profile-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =========================================================
-- View: profiles with reaction counts (for feed queries)
-- =========================================================
create or replace view public.profiles_with_stats as
select
  p.*,
  coalesce(r.reaction_count, 0) as reaction_count,
  (p.featured_until is not null and p.featured_until > now()) as is_featured
from public.profiles p
left join (
  select profile_id, count(*) as reaction_count
  from public.reactions
  group by profile_id
) r on r.profile_id = p.id;
