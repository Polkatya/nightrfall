'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { Film, ChevronLeft, ChevronRight } from 'lucide-react';
import { triggerPopunder } from '@/lib/popunder';

export type GalleryItem = {
  url: string;
  type: 'image' | 'video';
};

export default function ProfileGallery({
  items,
  alt,
  prevUsername,
  nextUsername,
  children,
}: {
  items: GalleryItem[];
  alt: string;
  prevUsername?: string | null;
  nextUsername?: string | null;
  children?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0];
  const router = useRouter();

  // Fire once when someone opens a profile — not on every click inside it.
  useEffect(() => {
    triggerPopunder();
  }, []);

  // Left/right arrow keys jump to the previous/next profile, not the photo.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && prevUsername) router.push(`/profile/${encodeURIComponent(prevUsername)}`);
      if (e.key === 'ArrowRight' && nextUsername) router.push(`/profile/${encodeURIComponent(nextUsername)}`);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prevUsername, nextUsername, router]);

  return (
    <div>
      <div className="relative aspect-[4/3] w-full bg-black">
        {current.type === 'video' ? (
          <video
            src={current.url}
            controls
            className="h-full w-full object-contain"
          />
        ) : (
          <Image src={current.url} alt={alt} fill className="object-cover" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {children}

        {/* these switch to a whole different profile, not the photo within this one */}
        {prevUsername && (
          <Link
            href={`/profile/${encodeURIComponent(prevUsername)}`}
            aria-label="Previous profile"
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
        )}
        {nextUsername && (
          <Link
            href={`/profile/${encodeURIComponent(nextUsername)}`}
            aria-label="Next profile"
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            <ChevronRight className="h-6 w-6" />
          </Link>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-white/5 bg-bg-elevated p-2">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={clsx(
                'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition',
                active === i ? 'border-accent-purple' : 'border-transparent opacity-70 hover:opacity-100'
              )}
            >
              {item.type === 'video' ? (
                <>
                  <video src={item.url} className="h-full w-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Film className="h-4 w-4 text-white" />
                  </div>
                </>
              ) : (
                <Image src={item.url} alt="" fill className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
