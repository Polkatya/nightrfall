'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';

const FILTERS = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Popular' },
  { value: 'ending_soon', label: 'Expiring Soon' },
];

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get('sort') ?? 'latest';

  function setSort(sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort);
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 py-4">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => setSort(f.value)}
          className={clsx(
            'rounded-full px-4 py-2 text-sm font-medium transition',
            active === f.value
              ? 'bg-grad-primary text-white shadow-glow'
              : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
