'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type VisitorHeartbeatProps = {
  view?: 'site' | 'stream';
  active?: boolean;
};

export default function VisitorHeartbeat({
  view = 'site',
  active = true,
}: VisitorHeartbeatProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!active || pathname.startsWith('/admin')) return;

    const ping = () => {
      void fetch('/api/heartbeat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view, path: pathname }),
      });
    };

    ping();
    const timer = window.setInterval(ping, 25000);
    return () => window.clearInterval(timer);
  }, [active, pathname, view]);

  return null;
}
