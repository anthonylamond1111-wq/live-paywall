'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { OWNER_EMAIL } from '@/lib/site-admin';
import {
  ensureSupportNotifyPermission,
  showSupportNotification,
} from '@/lib/support-notify';

const LAST_WAITING_KEY = 'ufc_admin_support_waiting';

/**
 * Owner-only: polls for open support threads and shows site notifications.
 * Visitors never see this.
 */
export default function OwnerSupportAlerts() {
  const [waiting, setWaiting] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const sync = (email: string | null | undefined, token: string | null) => {
      const owner = Boolean(email && email.toLowerCase() === OWNER_EMAIL);
      setIsOwner(owner);
      tokenRef.current = owner ? token : null;
    };

    supabase.auth.getSession().then(({ data }) => {
      sync(data.session?.user.email, data.session?.access_token ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      sync(session?.user.email, session?.access_token ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const poll = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;

    try {
      const res = await fetch('/api/support/chat/admin?summary=1', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const next = typeof data.waiting === 'number' ? data.waiting : 0;
      const prev = Number(sessionStorage.getItem(LAST_WAITING_KEY) ?? '0');

      if (next > prev) {
        showSupportNotification({
          title: 'New support message',
          body:
            next === 1
              ? '1 visitor is waiting for a reply'
              : `${next} visitors waiting for a reply`,
          tag: 'support-admin-waiting',
          onClick: () => {
            window.location.href = '/admin?tab=support';
          },
        });
      }

      sessionStorage.setItem(LAST_WAITING_KEY, String(next));
      setWaiting(next);
    } catch {
      // ignore transient poll errors
    }
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    void ensureSupportNotifyPermission();
    void poll();
    const timer = window.setInterval(() => void poll(), 8000);
    return () => window.clearInterval(timer);
  }, [isOwner, poll]);

  if (!isOwner || waiting < 1) return null;

  return (
    <Link
      href="/admin?tab=support"
      className="fixed bottom-28 left-4 z-50 flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500 px-4 py-2.5 text-xs font-semibold text-black shadow-lg shadow-amber-900/30 transition hover:bg-amber-400"
    >
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-amber-300">
        {waiting}
      </span>
      Support inbox
    </Link>
  );
}
