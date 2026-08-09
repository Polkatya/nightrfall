import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getCurrentUser } from '@/lib/supabase/server';
import { sendModerationRequest } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const profileId = body?.profile_id;
  if (!profileId) {
    return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, user_id, username, bio, tags, image_path, status, telegram_message_id')
    .eq('id', profileId)
    .single();

  // Only the owner can trigger their own notification, only while it's
  // actually pending, and only once (avoids duplicate Telegram cards if the
  // client retries the request).
  if (!profile || profile.user_id !== currentUser.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (profile.status !== 'pending' || profile.telegram_message_id) {
    return NextResponse.json({ success: true, skipped: true });
  }

  // Send the whole gallery, not just the cover — profile_media holds every
  // item the user uploaded (image_path/position 0 is already in there too).
  const { data: mediaRows } = await admin
    .from('profile_media')
    .select('media_path, media_type')
    .eq('profile_id', profile.id)
    .order('position', { ascending: true });

  const media =
    mediaRows && mediaRows.length > 0
      ? mediaRows.map((m: { media_path: string; media_type: string }) => ({
          url: admin.storage.from('profile-images').getPublicUrl(m.media_path).data.publicUrl,
          type: m.media_type as 'image' | 'video',
        }))
      : [
          {
            url: admin.storage.from('profile-images').getPublicUrl(profile.image_path).data.publicUrl,
            type: 'image' as const,
          },
        ];

  try {
    const sent = await sendModerationRequest({
      id: profile.id,
      username: profile.username,
      bio: profile.bio,
      tags: profile.tags ?? [],
      media,
    });

    if (sent) {
      await admin
        .from('profiles')
        .update({ telegram_chat_id: sent.chatId, telegram_message_id: sent.messageId })
        .eq('id', profile.id);
    }
  } catch (e) {
    // Not fatal for the user — the profile still exists as pending and an
    // admin can approve it manually from /admin even if Telegram is down.
    console.error('Failed to notify Telegram', e);
  }

  return NextResponse.json({ success: true });
}
