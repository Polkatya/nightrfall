import Link from 'next/link';
import { Plus, Eye, TrendingUp, Heart, ThumbsDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import DeleteProfileButton from '@/components/DeleteProfileButton';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  pending: { text: 'Under review', className: 'bg-amber-500/15 text-amber-300' },
  active: { text: 'Live', className: 'bg-emerald-500/15 text-emerald-300' },
  hidden: { text: 'Hidden', className: 'bg-zinc-500/15 text-zinc-400' },
};

export default async function MyProfilesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from('profiles_with_stats')
    .select('*')
    .eq('user_id', user!.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  const list = profiles ?? [];

  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Profiles</h1>
          <p className="mt-1 text-sm text-zinc-400">{list.length} of 1 used</p>
        </div>
        {list.length < 1 && (
          <Link
            href="/create"
            className="flex items-center gap-1.5 rounded-full bg-grad-primary px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New profile
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl2 border border-white/5 bg-bg-card p-8 text-center text-sm text-zinc-400">
          You haven&apos;t created any profiles yet.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((profile) => {
            const { data: img } = supabase.storage.from('profile-images').getPublicUrl(profile.image_path);
            const status = STATUS_LABEL[profile.status] ?? STATUS_LABEL.hidden;

            return (
              <div
                key={profile.id}
                className="rounded-xl2 border border-white/5 bg-bg-card p-3"
              >
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.publicUrl}
                    alt={profile.username}
                    className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${encodeURIComponent(profile.username)}`}
                        className="truncate text-sm font-semibold hover:underline"
                      >
                        {profile.username}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}>
                        {status.text}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Created {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <DeleteProfileButton profileId={profile.id} username={profile.username} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/5 pt-2.5 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5" title="Impressions — how many times this card showed up in the feed">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {profile.impression_count ?? 0}
                  </span>
                  <span className="flex items-center gap-1.5" title="Views — clicks into the profile">
                    <Eye className="h-3.5 w-3.5" />
                    {profile.view_count ?? 0}
                  </span>
                  <span className="flex items-center gap-1.5" title="Likes">
                    <Heart className="h-3.5 w-3.5" />
                    {profile.like_count ?? 0}
                  </span>
                  <span className="flex items-center gap-1.5" title="Dislikes">
                    <ThumbsDown className="h-3.5 w-3.5" />
                    {profile.dislike_count ?? 0}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
