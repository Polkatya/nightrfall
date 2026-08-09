'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { Film } from 'lucide-react';
import { triggerPopunder } from '@/lib/popunder';

export type GalleryItem = {
  url: string;
  type: 'image' | 'video';
};

export default function ProfileGallery({
  items,
  alt,
  children,
}: {
  items: GalleryItem[];
  alt: string;
  children?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const current = items[active] ?? items[0];

  // Fire once when someone opens a profile — not on every click inside it.
  useEffect(() => {
    triggerPopunder();
  }, []);

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
