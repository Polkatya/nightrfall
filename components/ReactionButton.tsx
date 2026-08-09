'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function ReactionButton({
  profileId,
  initialCount,
  initialReacted,
  isAuthed,
}: {
  profileId: string;
  initialCount: number;
  initialReacted: boolean;
  isAuthed: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(initialReacted);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthed) {
      toast.error('Log in to react');
      return;
    }

    const nextReacted = !reacted;
    setReacted(nextReacted);
    setCount((c) => (nextReacted ? c + 1 : c - 1));

    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (nextReacted) {
        const { error } = await supabase
          .from('reactions')
          .insert({ profile_id: profileId, user_id: user.id, reaction_type: 'heart' });
        if (error && error.code !== '23505') {
          setReacted(false);
          setCount((c) => c - 1);
          toast.error('Could not react');
        }
      } else {
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('profile_id', profileId)
          .eq('user_id', user.id)
          .eq('reaction_type', 'heart');
        if (error) {
          setReacted(true);
          setCount((c) => c + 1);
          toast.error('Could not remove reaction');
        }
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={clsx(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
        reacted
          ? 'bg-red-500/20 text-red-400'
          : 'bg-white/5 text-zinc-300 hover:bg-white/10'
      )}
    >
      <Heart className={clsx('h-4 w-4', reacted && 'fill-red-400')} />
      {count}
    </button>
  );
}
