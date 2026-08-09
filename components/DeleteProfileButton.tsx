'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function DeleteProfileButton({ profileId, username }: { profileId: string; username: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from('profiles').delete().eq('id', profileId);
    setDeleting(false);

    if (error) {
      toast.error('Could not delete profile');
      return;
    }
    toast.success(`Deleted ${username}`);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-400">Delete for good?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full bg-red-500/20 px-3 py-1 font-medium text-red-400 hover:bg-red-500/30 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-full bg-white/10 px-3 py-1 text-zinc-300 hover:bg-white/20"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
    >
      <Trash2 className="h-3.5 w-3.5" /> Delete
    </button>
  );
}
