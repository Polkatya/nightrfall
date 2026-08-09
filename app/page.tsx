import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ProfileCard from '@/components/ProfileCard';
import ImpressionTracker from '@/components/ImpressionTracker';
import FilterBar from '@/components/FilterBar';
import { FeedSkeleton, EmptyState } from '@/components/FeedStates';
import AdBanner from '@/components/ads/AdBanner';
import type { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

async function FeedGrid({ sort }: { sort: string }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from('profiles_with_stats')
    .select('*')
    .eq('status', 'active');

  if (sort === 'popular') {
    query = query.order('reaction_count', { ascending: false });
  } else if (sort === 'ending_soon') {
    query = query
      .not('featured_until', 'is', null)
      .gt('featured_until', new Date().toISOString())
      .order('featured_until', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data: profiles, error } = await query.limit(48);

  if (error || !profiles || profiles.length === 0) {
    return <EmptyState message={error ? 'Could not load profiles.' : 'No profiles yet — be the first to create one.'} />;
  }

  let reactionMap = new Map<string, 'like' | 'dislike'>();
  if (user) {
    const { data: myReactions } = await supabase
      .from('reactions')
      .select('profile_id, reaction_type')
      .eq('user_id', user.id);
    reactionMap = new Map((myReactions ?? []).map((r) => [r.profile_id, r.reaction_type]));
  }

  const enriched: Profile[] = profiles.map((p: any) => ({
    ...p,
    my_reaction: reactionMap.get(p.id) ?? null,
  }));

  return (
    <>
      <ImpressionTracker profileIds={enriched.map((p) => p.id)} />
      <div className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {enriched.map((profile) => {
          const { data } = supabase.storage.from('profile-images').getPublicUrl(profile.image_path);
          return (
            <ProfileCard
              key={profile.id}
              profile={profile}
              imageUrl={data.publicUrl}
              isAuthed={!!user}
            />
          );
        })}
      </div>
    </>
  );
}

export default function HomePage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort = searchParams.sort ?? 'latest';

  return (
    <div>
      <section className="py-14 text-center">
        <h1 className="bg-grad-primary bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          Discover the Community
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400">
          Explore profiles from the community.
        </p>
        <div className="mt-6">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-full bg-grad-primary px-6 py-3 text-sm font-medium text-white shadow-glow transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Share with photos or videos
          </Link>
        </div>
      </section>

      <div className="flex justify-center pb-6">
        <AdBanner />
      </div>

      <FilterBar />

      <Suspense fallback={<FeedSkeleton />} key={sort}>
        <FeedGrid sort={sort} />
      </Suspense>
    </div>
  );
}
