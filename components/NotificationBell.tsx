'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Heart, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import { createClient } from '@/lib/supabase/client';
import type { AppNotification } from '@/types/database';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const supabase = createClient();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(username), profile:profile_id(username)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const rows: AppNotification[] = (data ?? []).map((n: any) => ({
      ...n,
      actor_username: n.actor?.username ?? 'someone',
      profile_username: n.profile?.username ?? null,
    }));
    setNotifications(rows);
    setLoaded(true);
  }

  // Load the badge count on mount so it's already lit up if there's
  // unread activity from before this page load, then keep it live.
  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-white/10 bg-bg-elevated shadow-card">
          {!loaded ? (
            <p className="px-4 py-6 text-center text-xs text-zinc-500">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-zinc-500">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.profile_id ? `/profile/${n.profile_id}` : '#'}
                onClick={() => setOpen(false)}
                className={clsx(
                  'flex items-start gap-2.5 border-b border-white/5 px-4 py-3 text-sm transition hover:bg-white/5 last:border-b-0',
                  !n.is_read && 'bg-accent-purple/5'
                )}
              >
                {n.type === 'like' ? (
                  <Heart className="mt-0.5 h-4 w-4 shrink-0 fill-red-400 text-red-400" />
                ) : (
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-purple" />
                )}
                <div className="min-w-0">
                  <p className="text-zinc-200">
                    <span className="font-medium">{n.actor_username}</span>{' '}
                    {n.type === 'like' ? 'liked' : 'commented on'}{' '}
                    <span className="font-medium">{n.profile_username ?? 'your profile'}</span>
                  </p>
                  {n.comment_preview && (
                    <p className="mt-0.5 truncate text-xs text-zinc-500">&ldquo;{n.comment_preview}&rdquo;</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-zinc-500">{timeAgo(n.created_at)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
