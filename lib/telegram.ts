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
 * Sends the new-profile moderation card to the admin chat, with an inline
 * "Approve / Reject" keyboard. Returns the chat/message id so the webhook
 * can later edit this exact message once a decision is made.
 */
export async function sendModerationRequest(profile: {
  id: string;
  username: string;
  bio: string | null;
  tags: string[];
  coverImageUrl: string;
}): Promise<SendResult> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error('TELEGRAM_CHAT_ID is not set');

  const link = siteUrl() ? `${siteUrl()}/profile/${profile.username}` : `/profile/${profile.username}`;
  const caption = [
    `🆕 New profile: *${escapeMd(profile.username)}*`,
    profile.bio ? escapeMd(profile.bio) : null,
    profile.tags.length ? profile.tags.map((t) => `#${t}`).join(' ') : null,
    `[View on site](${link})`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: profile.coverImageUrl,
      caption,
      parse_mode: 'MarkdownV2',
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
    console.error('Telegram sendPhoto failed', data);
    return null;
  }

  return { chatId: String(data.result.chat.id), messageId: String(data.result.message_id) };
}

/** Edits the original moderation card once an admin has approved/rejected it. */
export async function editModerationMessage(
  chatId: string,
  messageId: string,
  decisionText: string
) {
  await fetch(`${TELEGRAM_API}/bot${botToken()}/editMessageCaption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      caption: decisionText,
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
