import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_REASONS = [
  'inappropriate_content',
  'underage',
  'impersonation',
  'harassment',
  'spam',
  'other',
];

// Very small in-memory rate limiter (per server instance). For production,
// replace with a durable store (e.g. Upstash Redis) behind serverless.
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5; // reports
const RATE_WINDOW_MS = 60_000; // per minute

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return timestamps.length > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  // Always resolve the user from the server-side session — never trust the client.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: 'Too many reports. Please slow down.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.profile_id !== 'string' || !VALID_REASONS.includes(body.reason)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const description =
    typeof body.description === 'string' ? body.description.slice(0, 1000) : null;

  const { error } = await supabase.from('reports').insert({
    profile_id: body.profile_id,
    reporter_id: user.id,
    reason: body.reason,
    description,
  });

  if (error) {
    return NextResponse.json({ error: 'Could not submit report' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
