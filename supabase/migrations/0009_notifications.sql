-- ---------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade, -- recipient
  actor_id uuid references public.users(id) on delete set null, -- who did it
  profile_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'comment')),
  comment_preview text, -- short snippet, only set for type = 'comment'
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications are only ever created by the triggers below (security
-- definer), never inserted directly by a client, so there's no insert
-- policy for regular users.

-- ---------------------------------------------------------
-- Trigger: new like -> notify the profile owner (not on self-like, and
-- only for 'like' reactions — dislikes stay silent so people aren't
-- pinged every time someone dislikes them).
-- ---------------------------------------------------------
create or replace function public.notify_on_like() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  if new.reaction_type <> 'like' then
    return new;
  end if;

  select user_id into owner_id from public.profiles where id = new.profile_id;

  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications (user_id, actor_id, profile_id, type)
    values (owner_id, new.user_id, new.profile_id, 'like');
  end if;

  return new;
end;
$$;

create trigger trg_notify_on_like
  after insert on public.reactions
  for each row execute function public.notify_on_like();

-- ---------------------------------------------------------
-- Trigger: new comment -> notify the profile owner (not on self-comment).
-- ---------------------------------------------------------
create or replace function public.notify_on_comment() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select user_id into owner_id from public.profiles where id = new.profile_id;

  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications (user_id, actor_id, profile_id, type, comment_preview)
    values (owner_id, new.user_id, new.profile_id, 'comment', left(new.content, 120));
  end if;

  return new;
end;
$$;

create trigger trg_notify_on_comment
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- Realtime: without this, the bell's postgres_changes subscription won't
-- receive new rows and will only update on the next full reload.
alter publication supabase_realtime add table public.notifications;
