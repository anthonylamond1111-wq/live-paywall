'use client';

import { usePathname } from 'next/navigation';
import VisitorHeartbeat from '@/components/VisitorHeartbeat';

export default function SiteVisitorHeartbeat() {
  const pathname = usePathname();
  if (pathname === '/' || pathname.startsWith('/admin')) return null;
  return <VisitorHeartbeat view="site" />;
}
