'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Images } from 'lucide-react';
import type { Profile } from '@/types/database';
import CountdownTimer from './CountdownTimer';
import ReactionButton from './ReactionButton';
import ReportModal from './ReportModal';

export default function ProfileCard({
  profile,
  imageUrl,
  isAuthed,
}: {
  profile: Profile;
  imageUrl: string;
  isAuthed: boolean;
}) {
  return (
    <Link
      href={`/profile/${encodeURIComponent(profile.username)}`}
      className="group relative flex flex-col overflow-hidden rounded-xl2 border border-white/5 bg-bg-card shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-glow"
    >
      <div
        className="relative aspect-[3/4] w-full overflow-hidden"
      >
        <Image
          src={imageUrl}
          alt={profile.username}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        <div className="absolute left-2.5 top-2.5 flex items-center gap-2">
          {profile.is_featured && profile.featured_until && (
            <CountdownTimer featuredUntil={profile.featured_until} />
          )}
          {profile.media_count && profile.media_count > 1 && (
            <div className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <Images className="h-3 w-3" />
              {profile.media_count}
            </div>
          )}
        </div>

        <div className="absolute right-2.5 top-2.5">
          <ReportModal profileId={profile.id} isAuthed={isAuthed} />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="truncate text-sm font-semibold text-white">{profile.username}</h3>
          {profile.bio && (
            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-300">{profile.bio}</p>
          )}
          {profile.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {profile.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-200 backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5">
        <ReactionButton
          profileId={profile.id}
          initialLikeCount={profile.like_count ?? profile.reaction_count ?? 0}
          initialDislikeCount={profile.dislike_count ?? 0}
          initialReaction={profile.my_reaction ?? null}
          isAuthed={isAuthed}
        />
        <span className="text-xs text-zinc-500">
          {new Date(profile.created_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}
