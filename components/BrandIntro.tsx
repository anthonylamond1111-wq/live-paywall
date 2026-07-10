import BrandLogo from '@/components/BrandLogo';

import { useEffect, useState } from 'react';

const INTRO_KEY = 'ufc_access_intro_seen';

export default function BrandIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(INTRO_KEY) === '1') return;
    setVisible(true);
    sessionStorage.setItem(INTRO_KEY, '1');

    const timer = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="brand-intro fixed inset-0 z-[200] flex items-center justify-center bg-black">
      <div className="text-center">
        <BrandLogo size="intro" className="brand-intro-logo" />
        <div className="brand-intro-line mx-auto mt-4 h-0.5 w-24 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
        <p className="brand-intro-tag mt-4 text-xs uppercase tracking-[0.4em] text-gray-500">
          Live stream
        </p>
      </div>
    </div>
  );
}
