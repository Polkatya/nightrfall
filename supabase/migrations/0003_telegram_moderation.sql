-- =========================================================
-- Telegram moderation queue
-- New profiles now go to 'pending' first and only become
-- publicly visible once an admin approves them via Telegram.
-- =========================================================

-- allow the new 'pending' status
alter table public.profiles drop constraint profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'active', 'hidden', 'deleted'));

alter table public.profiles alter column status set default 'pending';

-- track the Telegram message so the webhook can edit it once reviewed
alter table public.profiles add column telegram_chat_id text;
alter table public.profiles add column telegram_message_id text;

-- Defense in depth: force every new row to start as 'pending' no matter
-- what the client sends (the client can't be trusted to self-approve).
create or replace function public.force_pending_status()
returns trigger language plpgsql as $$
begin
  new.status = 'pending';
  return new;
end;
$$;

create trigger trg_profiles_force_pending
  before insert on public.profiles
  for each row execute function public.force_pending_status();

-- log entries for the two new moderation actions performed via Telegram
alter table public.moderation_logs drop constraint moderation_logs_action_check;
alter table public.moderation_logs add constraint moderation_logs_action_check
  check (action in (
    'hide_profile', 'restore_profile', 'delete_profile',
    'approve_profile', 'reject_profile',
    'ban_user', 'unban_user', 'resolve_report', 'dismiss_report'
  ));
