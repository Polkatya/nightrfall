'use client';

import { useState, useTransition } from 'react';
import { Heart, ThumbsDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import type { ReactionType } from '@/types/database';

export default function ReactionButton({
  profileId,
  initialLikeCount,
  initialDislikeCount,
  initialReaction,
  isAuthed,
}: {
  profileId: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialReaction: ReactionType | null;
  isAuthed: boolean;
}) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [reaction, setReaction] = useState<ReactionType | null>(initialReaction);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function handleClick(e: React.MouseEvent, type: ReactionType) {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthed) {
      toast.error('Log in to react');
      return;
    }

    const prevReaction = reaction;
    const nextReaction: ReactionType | null = prevReaction === type ? null : type;

    // optimistic update
    setReaction(nextReaction);
    if (prevReaction === 'like') setLikeCount((c) => c - 1);
    if (prevReaction === 'dislike') setDislikeCount((c) => c - 1);
    if (nextReaction === 'like') setLikeCount((c) => c + 1);
    if (nextReaction === 'dislike') setDislikeCount((c) => c + 1);

    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let error = null;
      if (nextReaction === null) {
        ({ error } = await supabase
          .from('reactions')
          .delete()
          .eq('profile_id', profileId)
          .eq('user_id', user.id));
      } else {
        ({ error } = await supabase
          .from('reactions')
          .upsert(
            { profile_id: profileId, user_id: user.id, reaction_type: nextReaction },
            { onConflict: 'profile_id,user_id' }
          ));
      }

      if (error) {
        // roll back on failure
        setReaction(prevReaction);
        if (prevReaction === 'like') setLikeCount((c) => c + 1);
        if (prevReaction === 'dislike') setDislikeCount((c) => c + 1);
        if (nextReaction === 'like') setLikeCount((c) => c - 1);
        if (nextReaction === 'dislike') setDislikeCount((c) => c - 1);
        toast.error('Could not save reaction');
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={(e) => handleClick(e, 'like')}
        disabled={isPending}
        className={clsx(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
          reaction === 'like'
            ? 'bg-red-500/20 text-red-400'
            : 'bg-white/5 text-zinc-300 hover:bg-white/10'
        )}
      >
        <Heart className={clsx('h-4 w-4', reaction === 'like' && 'fill-red-400')} />
        {likeCount}
      </button>
      <button
        onClick={(e) => handleClick(e, 'dislike')}
        disabled={isPending}
        className={clsx(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
          reaction === 'dislike'
            ? 'bg-zinc-400/20 text-zinc-200'
            : 'bg-white/5 text-zinc-300 hover:bg-white/10'
        )}
      >
        <ThumbsDown className={clsx('h-4 w-4', reaction === 'dislike' && 'fill-zinc-200')} />
        {dislikeCount}
      </button>
    </div>
  );
}
