'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

function formatRemaining(ms: number): string {
  if (ms <= 0) return '';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export default function CountdownTimer({ featuredUntil }: { featuredUntil: string }) {
  const target = new Date(featuredUntil).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(target - Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, [target]);

  if (remaining <= 0) return null;

  return (
    <div className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
      <Clock className="h-3 w-3 text-accent-purple" />
      {formatRemaining(remaining)}
    </div>
  );
}
