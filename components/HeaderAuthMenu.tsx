'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function HeaderAuthMenu({
  username,
  isAdmin,
}: {
  username: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Logged out');
    setOpen(false);
    router.push('/');
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
      >
        <User className="h-4 w-4" />
        {username}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-bg-elevated shadow-card">
          {isAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/5"
            >
              <ShieldCheck className="h-4 w-4" /> Admin Panel
            </a>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
