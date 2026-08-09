'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Fires a single batched RPC counting one "impression" (feed appearance)
 * for every profile id currently rendered on the page. Renders nothing.
 */
export default function ImpressionTracker({ profileIds }: { profileIds: string[] }) {
  const firedFor = useRef<string>('');

  useEffect(() => {
    if (profileIds.length === 0) return;

    // guard against double-firing in React strict mode / re-renders with
    // the same set of ids already counted
    const key = profileIds.join(',');
    if (firedFor.current === key) return;
    firedFor.current = key;

    const supabase = createClient();
    supabase.rpc('increment_profile_impressions', { p_ids: profileIds }).then(({ error }) => {
      if (error) console.error('impression tracking failed', error);
    });
  }, [profileIds]);

  return null;
}
