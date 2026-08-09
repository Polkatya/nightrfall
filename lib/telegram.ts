// Minimal Telegram Bot API client used for the moderation queue.
// New profiles are sent here for a human approve/reject before going live —
// see app/api/telegram/notify-new-profile and app/api/telegram/webhook.

const TELEGRAM_API = 'https://api.telegram.org';

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return token;
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
}

type SendResult = { chatId: string; messageId: string } | null;

/**
 * Sends the full gallery (photos/videos) as an album (or a single item if
 * there's only one — Telegram's media-group API requires at least 2).
 */
export async function sendMediaGroup(
  chatId: string,
  media: { url: string; type: 'image' | 'video' }[]
) {
  if (media.length === 0) return;

  if (media.length === 1) {
    const item = media[0];
    const method = item.type === 'video' ? 'sendVideo' : 'sendPhoto';
    const field = item.type === 'video' ? 'video' : 'photo';
    await fetch(`${TELEGRAM_API}/bot${botToken()}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, [field]: item.url }),
    }).catch(() => null);
    return;
  }

  const capped = media.slice(0, 10); // Telegram's media-group cap
  await fetch(`${TELEGRAM_API}/bot${botToken()}/sendMediaGroup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      media: capped.map((item) => ({
        type: item.type === 'video' ? 'video' : 'photo',
        media: item.url,
      })),
    }),
  }).catch(() => null);
}

/**
 * Sends the new-profile moderation card to the admin chat: first the full
 * gallery as an album, then a text message with the details and an inline
 * "Approve / Reject" keyboard (media-group messages can't carry buttons,
 * so the two are always separate). Returns the *text* message's chat/id so
 * the webhook can later edit it once a decision is made.
 */
export async function sendModerationRequest(profile: {
  id: string;
  username: string;
  bio: string | null;
  tags: string[];
  media: { url: string; type: 'image' | 'video' }[];
}): Promise<SendResult> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error('TELEGRAM_CHAT_ID is not set');

  await sendMediaGroup(chatId, profile.media);

  const link = siteUrl() ? `${siteUrl()}/profile/${profile.id}` : `/profile/${profile.id}`;
  const mediaNote = profile.media.length > 1 ? `${profile.media.length} items ⬆️` : null;
  const caption = [
    `🆕 New profile: *${escapeMd(profile.username)}*`,
    mediaNote,
    profile.bio ? escapeMd(profile.bio) : null,
    profile.tags.length ? profile.tags.map((t) => `#${t}`).join(' ') : null,
    `[View on site](${link})`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: caption,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: `approve:${profile.id}` },
            { text: '❌ Reject', callback_data: `reject:${profile.id}` },
          ],
        ],
      },
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error('Telegram sendMessage (moderation) failed', data);
    return null;
  }

  return { chatId: String(data.result.chat.id), messageId: String(data.result.message_id) };
}

/**
 * Sends one profile as a photo card with action buttons, used by the
 * /profiles command so an admin can see the actual content before deciding.
 * Pending profiles get Approve/Reject too (not just Delete) — the automatic
 * moderation card sent at submission time is best-effort and can fail to
 * send, so this is the fallback way to actually approve something stuck in
 * pending.
 */
export async function sendProfileCard(
  chatId: string,
  profile: { id: string; username: string; status: string; coverImageUrl: string }
) {
  const link = siteUrl() ? `${siteUrl()}/profile/${profile.id}` : `/profile/${profile.id}`;
  const caption = [
    `*${escapeMd(profile.username)}* — ${escapeMd(profile.status)}`,
    `[View on site](${link})`,
  ].join('\n');

  const buttons =
    profile.status === 'pending'
      ? [
          [
            { text: '✅ Approve', callback_data: `approve:${profile.id}` },
            { text: '❌ Reject', callback_data: `reject:${profile.id}` },
          ],
          [{ text: '🗑️ Delete', callback_data: `delete:${profile.id}` }],
        ]
      : [[{ text: '🗑️ Delete', callback_data: `delete:${profile.id}` }]];

  await fetch(`${TELEGRAM_API}/bot${botToken()}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: profile.coverImageUrl,
      caption,
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: buttons },
    }),
  }).catch(() => null);
}

/** Edits the original moderation card (a plain text message) once an admin has approved/rejected it. */
export async function editMessageText(chatId: string, messageId: string, text: string) {
  await fetch(`${TELEGRAM_API}/bot${botToken()}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    }),
  }).catch(() => null);
}

/** Edits a photo message's caption — used by the /profiles → Delete flow (still a single photo card). */
export async function editMessageCaption(
  chatId: string,
  messageId: string,
  caption: string
) {
  await fetch(`${TELEGRAM_API}/bot${botToken()}/editMessageCaption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      caption,
      parse_mode: 'MarkdownV2',
    }),
  }).catch(() => null);
}

/** Plain text message, used for bot commands (/profiles, /delete, /help). */
export async function sendMessage(chatId: string, text: string) {
  await fetch(`${TELEGRAM_API}/bot${botToken()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    }),
  }).catch(() => null);
}

export async function answerCallbackQuery(callbackQueryId: string, text: string) {
  await fetch(`${TELEGRAM_API}/bot${botToken()}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  }).catch(() => null);
}

// Telegram's MarkdownV2 requires these characters to be escaped anywhere
// they appear in plain text (not intended as formatting).
export function escapeMd(text: string) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
