import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReactionButton from '@/components/ReactionButton';
import ReportModal from '@/components/ReportModal';
import CountdownTimer from '@/components/CountdownTimer';
import ProfileGallery, { type GalleryItem } from '@/components/ProfileGallery';
import AdBanner from '@/components/ads/AdBanner';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username = params.username;
  if (username === 'me') {
    if (!user) notFound();
    const { data: me } = await supabase.from('users').select('username').eq('id', user.id).single();
    if (!me) notFound();
    username = me.username;
  }

  const { data: profile } = await supabase
    .from('profiles_with_stats')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile || (profile.status !== 'active' && profile.user_id !== user?.id)) {
    notFound();
  }

  // count this as a "view" (a click into the profile)
  const { error: viewError } = await supabase.rpc('increment_profile_view', { p_id: profile.id });
  if (viewError) console.error('view tracking failed', viewError);

  let myReaction: 'like' | 'dislike' | null = null;
  if (user) {
    const { data } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('profile_id', profile.id)
      .eq('user_id', user.id)
      .maybeSingle();
    myReaction = data?.reaction_type ?? null;
  }

  const { data: mediaRows } = await supabase
    .from('profile_media')
    .select('media_path, media_type')
    .eq('profile_id', profile.id)
    .order('position', { ascending: true });

  const galleryItems: GalleryItem[] =
    mediaRows && mediaRows.length > 0
      ? mediaRows.map((m) => ({
          url: supabase.storage.from('profile-images').getPublicUrl(m.media_path).data.publicUrl,
          type: m.media_type as 'image' | 'video',
        }))
      : [
          {
            url: supabase.storage.from('profile-images').getPublicUrl(profile.image_path).data.publicUrl,
            type: 'image',
          },
        ];

  return (
    <div className="mx-auto max-w-2xl py-10">
      {profile.status === 'pending' && profile.user_id === user?.id && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Your profile is awaiting review and isn&apos;t visible to others yet.
        </div>
      )}

      <div className="mb-6 flex justify-center">
        <AdBanner />
      </div>

      <div className="overflow-hidden rounded-xl2 border border-white/5 bg-bg-card shadow-card">
        <ProfileGallery items={galleryItems} alt={profile.username}>
          {profile.is_featured && profile.featured_until && (
            <div className="absolute left-3 top-3">
              <CountdownTimer featuredUntil={profile.featured_until} />
            </div>
          )}
          <div className="absolute right-3 top-3">
            <ReportModal profileId={profile.id} isAuthed={!!user} />
          </div>
        </ProfileGallery>

        <div className="p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">{profile.username}</h1>
            <ReactionButton
              profileId={profile.id}
              initialLikeCount={profile.like_count ?? profile.reaction_count ?? 0}
              initialDislikeCount={profile.dislike_count ?? 0}
              initialReaction={myReaction}
              isAuthed={!!user}
            />
          </div>

          {profile.bio && <p className="mt-3 text-sm leading-relaxed text-zinc-300">{profile.bio}</p>}

          {profile.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p className="mt-6 text-xs text-zinc-500">
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <AdBanner />
      </div>
    </div>
  );
}
