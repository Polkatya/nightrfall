import { Users } from 'lucide-react';

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl2 border border-white/5 bg-bg-card">
      <div className="skeleton aspect-[3/4] w-full" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function EmptyState({ message = 'No profiles yet.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="rounded-full bg-white/5 p-4">
        <Users className="h-6 w-6 text-zinc-500" />
      </div>
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
