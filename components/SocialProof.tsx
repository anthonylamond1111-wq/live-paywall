'use client';

import { useEffect, useState } from 'react';

export default function SocialProof() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    void fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => setCount(d.displayCount ?? 12))
      .catch(() => setCount(12));
  }, []);

  if (count === null) return null;

  return (
    <p className="text-center text-sm text-gray-400">
      <span className="font-semibold text-white">{count}+</span> fans unlocked access tonight
    </p>
  );
}
