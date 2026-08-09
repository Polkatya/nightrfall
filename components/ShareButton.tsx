'use client';

import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareButton({ username }: { username: string }) {
  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}/profile/${username}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: username, url });
      } catch {
        // user cancelled the share sheet — not an error
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
    >
      <Share2 className="h-3.5 w-3.5" />
      Share
    </button>
  );
}
