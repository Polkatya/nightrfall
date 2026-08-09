import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/server';
import HeaderAuthMenu from './HeaderAuthMenu';

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Sparkles className="h-5 w-5 text-accent-purple" />
          <span className="bg-grad-primary bg-clip-text text-transparent">Nightfall</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          <Link href="/?sort=latest" className="transition hover:text-white">Discover</Link>
          <Link href="/?sort=popular" className="transition hover:text-white">Popular</Link>
          <Link href="/?sort=latest" className="transition hover:text-white">Latest</Link>
          <Link href="/rules" className="transition hover:text-white">Rules</Link>
          {user && (
            <Link href={`/profile/me`} className="transition hover:text-white">My Profile</Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/create"
                className="flex items-center gap-1.5 rounded-full bg-grad-primary px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Create
              </Link>
              <HeaderAuthMenu username={user.username} isAdmin={user.role === 'admin'} />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-zinc-300 hover:text-white">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-grad-primary px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
