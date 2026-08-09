'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { usernameToAuthEmail } from '@/lib/auth-email';
import toast from 'react-hot-toast';
import { Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToAuthEmail(username),
      password,
    });
    setLoading(false);

    if (error) {
      toast.error('Incorrect username or password');
      return;
    }
    toast.success('Welcome back');
    router.push(searchParams.get('next') ?? '/');
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center py-20">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-zinc-400">Welcome back to the community.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Username</label>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-bg-card px-3 py-2.5 focus-within:border-accent-purple">
            <User className="h-4 w-4 text-zinc-500" />
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="yourname"
              autoComplete="username"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Password</label>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-bg-card px-3 py-2.5 focus-within:border-accent-purple">
            <Lock className="h-4 w-4 text-zinc-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-grad-primary py-2.5 text-sm font-medium text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Don't have an account?{' '}
        <Link href="/register" className="text-accent-purple hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
