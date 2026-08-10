'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Trash2, Send } from 'lucide-react';
import type { Comment } from '@/types/database';

export default function CommentSection({
  profileId,
  initialComments,
  isAuthed,
  currentUserId,
}: {
  profileId: string;
  initialComments: Comment[];
  isAuthed: boolean;
  currentUserId: string | null;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    if (!isAuthed) {
      toast.error('Log in to comment');
      return;
    }
    if (content.length > 500) {
      toast.error('Comment is too long (max 500 characters)');
      return;
    }

    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: inserted, error } = await supabase
        .from('comments')
        .insert({ profile_id: profileId, user_id: user.id, content })
        .select('id, profile_id, user_id, content, created_at')
        .single();

      if (error || !inserted) {
        toast.error('Could not post comment');
        return;
      }

      const { data: me } = await supabase.from('users').select('username').eq('id', user.id).single();

      setComments((prev) => [{ ...inserted, username: me?.username ?? 'you' }, ...prev]);
      setText('');
    });
  }

  function handleDelete(commentId: string) {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== commentId));

    startTransition(async () => {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) {
        setComments(prev);
        toast.error('Could not delete comment');
      }
    });
  }

  return (
    <div className="mt-6 border-t border-white/5 pt-6">
      <h2 className="mb-3 text-sm font-semibold text-zinc-200">
        Comments {comments.length > 0 && <span className="text-zinc-500">({comments.length})</span>}
      </h2>

      {isAuthed ? (
        <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder="Write a comment..."
            className="flex-1 rounded-lg border border-white/10 bg-bg-card px-3 py-2 text-sm outline-none focus:border-accent-purple"
          />
          <button
            type="submit"
            disabled={isPending || !text.trim()}
            className="flex items-center gap-1 rounded-lg bg-accent-purple px-3 py-2 text-sm font-medium text-white transition disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <p className="mb-4 text-xs text-zinc-500">Log in to leave a comment.</p>
      )}

      {comments.length === 0 ? (
        <p className="text-xs text-zinc-500">No comments yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-200">{c.username ?? 'user'}</span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-zinc-300">{c.content}</p>
              </div>
              {currentUserId === c.user_id && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="shrink-0 text-zinc-500 transition hover:text-red-400"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
