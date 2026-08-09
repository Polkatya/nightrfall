import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { answerCallbackQuery, editModerationMessage } from '@/lib/telegram';

/**
 * Receives callback_query updates from Telegram when an admin taps
 * Approve/Reject on a moderation card. Must be registered with Telegram via
 * setWebhook (see README) before it will actually receive anything.
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

function escapeMd(text: string) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
