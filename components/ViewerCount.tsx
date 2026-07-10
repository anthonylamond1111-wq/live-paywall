'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

type ViewerCountProps = {
  session: Session;
  onCountChange?: (count: number) => void;
};

export default function ViewerCount({ session, onCountChange }: ViewerCountProps) {
  const [count, setCount] = useState(1);

  useEffect(() => {
    onCountChange?.(count);
  }, [count, onCountChange]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase.channel('live-viewers', {
      config: { presence: { key: session.user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const total = Object.keys(state).length;
        setCount(Math.max(1, total));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: session.user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session.user.id]);

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      <span>
        <span className="font-semibold text-gray-300">{count}</span> watching live
      </span>
    </div>
  );
}
