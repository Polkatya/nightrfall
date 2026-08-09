'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { usernameToAuthEmail } from '@/lib/auth-email';
import toast from 'react-hot-toast';
import { Lock, User } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!confirmedAge) {
      toast.error('You must confirm you are 18 or older');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      toast.error('Username must be 3-24 characters (letters, numbers, underscore)');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: usernameToAuthEmail(username),
      password,
      options: { data: { username } },
    });
    setLoading(false);

    if (error) {
      // Supabase's default error mentions "email" since that's the underlying
      // field — reword it so it reads correctly for a username-only form.
      if (/email/i.test(error.message)) {
        toast.error('This username is already taken or invalid');
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success('Account created — you can log in now');
    router.push(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center py-16">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-zinc-400">Join the community.</p>

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
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={confirmedAge}
            onChange={(e) => setConfirmedAge(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-bg-card accent-accent-purple"
          />
          I confirm that I am 18 years of age or older.
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-grad-primary py-2.5 text-sm font-medium text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="text-accent-purple hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
