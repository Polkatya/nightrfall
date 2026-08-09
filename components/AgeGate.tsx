'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

const STORAGE_KEY = 'nightfall_age_confirmed';

export default function AgeGate() {
  // Default to "show the gate" so there's no flash of content before we've
  // had a chance to check localStorage on mount.
  const [show, setShow] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const confirmed = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';
    setShow(!confirmed);
    setChecked(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = show ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  function confirm() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  }

  function leave() {
    window.location.href = 'https://www.google.com';
  }

  // Avoid rendering the gate markup at all until we've checked localStorage,
  // and avoid ever rendering it as "hidden" — it's either fully up or gone.
  if (!checked || !show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg p-4">
      <div className="glass w-full max-w-sm rounded-xl2 p-6 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple/20">
          <ShieldAlert className="h-6 w-6 text-accent-purple" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-white">18+ only</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          This site contains adult content and is intended only for people who are
          18 years of age or older. By entering, you confirm that you meet this
          requirement.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={confirm}
            className="w-full rounded-lg bg-grad-primary py-2.5 text-sm font-medium text-white shadow-glow transition hover:opacity-90"
          >
            I am 18 or older — Enter
          </button>
          <button
            onClick={leave}
            className="w-full rounded-lg bg-white/5 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/10"
          >
            I am under 18 — Leave
          </button>
        </div>
      </div>
    </div>
  );
}
