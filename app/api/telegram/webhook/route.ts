import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { answerCallbackQuery, editModerationMessage, sendMessage, escapeMd } from '@/lib/telegram';

/**
 * Receives updates from Telegram: callback_query (Approve/Reject taps on a
 * moderation card) and plain text messages (bot commands: /profiles,
 * /delete, /help). Must be registered with Telegram via setWebhook (see
 * README) before it will actually receive anything.
 */
export async function POST(req: NextRequest) {
  // Telegram sends this secret back on every webhook call when the webhook
  // was registered with secret_token — confirms the request really is from
  // Telegram and not someone guessing the URL.
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const update = await req.json().catch(() => null);

  if (update?.message?.text) {
    return handleCommand(update.message);
  }

  const callback = update?.callback_query;
  if (!callback?.data) {
    return NextResponse.json({ ok: true }); // ignore updates we don't care about
  }

  const [action, profileId] = String(callback.data).split(':');
  const chatId = String(callback.message?.chat?.id ?? '');
  const messageId = String(callback.message?.message_id ?? '');

  if (!profileId || (action !== 'approve' && action !== 'reject')) {
    await answerCallbackQuery(callback.id, 'Unknown action');
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, username, status')
    .eq('id', profileId)
    .single();

  if (!profile) {
    await answerCallbackQuery(callback.id, 'Profile no longer exists');
    return NextResponse.json({ ok: true });
  }

  if (profile.status !== 'pending') {
    // Someone already handled this one (double tap, or handled from /admin).
    await answerCallbackQuery(callback.id, `Already ${profile.status}`);
    return NextResponse.json({ ok: true });
  }

  const newStatus = action === 'approve' ? 'active' : 'hidden';
  await admin.from('profiles').update({ status: newStatus }).eq('id', profileId);

  // Best-effort audit log — only if we can find an admin user to attribute it to.
  const { data: anyAdmin } = await admin.from('users').select('id').eq('role', 'admin').limit(1).maybeSingle();
  if (anyAdmin) {
    await admin.from('moderation_logs').insert({
      admin_id: anyAdmin.id,
      action: action === 'approve' ? 'approve_profile' : 'reject_profile',
      target_type: 'profile',
      target_id: profileId,
      notes: 'Decided via Telegram',
    });
  }

  const decisionText =
    action === 'approve'
      ? `✅ *${escapeMd(profile.username)}* — approved, now live`
      : `❌ *${escapeMd(profile.username)}* — rejected`;

  if (chatId && messageId) {
    await editModerationMessage(chatId, messageId, decisionText);
  }
  await answerCallbackQuery(callback.id, action === 'approve' ? 'Approved' : 'Rejected');

  return NextResponse.json({ ok: true });
}


const STATUS_EMOJI: Record<string, string> = {
  pending: '🕒',
  active: '✅',
  hidden: '🙈',
};

/**
 * Text-command handler for the moderation bot. Only the configured admin
 * chat (TELEGRAM_CHAT_ID) is allowed to run these — anyone else is
 * silently ignored so the bot doesn't leak that it even has commands.
 *
 *   /profiles          list the 20 most recent non-deleted profiles
 *   /delete <username>  soft-delete a profile by username
 *   /help               list commands
 */
async function handleCommand(message: any) {
  const chatId = String(message.chat?.id ?? '');
  if (!chatId || chatId !== process.env.TELEGRAM_CHAT_ID) {
    return NextResponse.json({ ok: true });
  }

  const text = String(message.text ?? '').trim();
  const [rawCommand, ...rest] = text.split(/\s+/);
  const command = rawCommand.replace(/@\w+$/, '').toLowerCase(); // strip @BotName if present

  const admin = createAdminClient();

  if (command === '/profiles' || command === '/list') {
    const { data: profiles } = await admin
      .from('profiles')
      .select('username, status, created_at')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!profiles || profiles.length === 0) {
      await sendMessage(chatId, 'No profiles yet\\.');
      return NextResponse.json({ ok: true });
    }

    const lines = profiles.map(
      (p: { username: string; status: string }) =>
        `${STATUS_EMOJI[p.status] ?? '•'} *${escapeMd(p.username)}* — ${escapeMd(p.status)}`
    );
    lines.push('', 'Delete one with `/delete username`');
    await sendMessage(chatId, lines.join('\n'));
    return NextResponse.json({ ok: true });
  }

  if (command === '/delete') {
    const username = rest[0];
    if (!username) {
      await sendMessage(chatId, 'Usage: `/delete username`');
      return NextResponse.json({ ok: true });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('id, username, status')
      .ilike('username', username)
      .neq('status', 'deleted')
      .maybeSingle();

    if (!profile) {
      await sendMessage(chatId, `No active profile found for *${escapeMd(username)}*\\.`);
      return NextResponse.json({ ok: true });
    }

    await admin.from('profiles').update({ status: 'deleted' }).eq('id', profile.id);

    const { data: anyAdmin } = await admin.from('users').select('id').eq('role', 'admin').limit(1).maybeSingle();
    if (anyAdmin) {
      await admin.from('moderation_logs').insert({
        admin_id: anyAdmin.id,
        action: 'delete_profile',
        target_type: 'profile',
        target_id: profile.id,
        notes: 'Deleted via Telegram command',
      });
    }

    await sendMessage(chatId, `🗑️ Deleted *${escapeMd(profile.username)}*\\.`);
    return NextResponse.json({ ok: true });
  }

  await sendMessage(
    chatId,
    ['*Commands*', '`/profiles` — list recent profiles', '`/delete username` — delete a profile'].join('\n')
  );
  return NextResponse.json({ ok: true });
}
