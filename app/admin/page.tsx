'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { OWNER_EMAIL } from '@/lib/site-admin';

type AdminTab = 'live' | 'analytics';

type AdminStats = {
  activeOnSite: number;
  watchingStream: number;
  purchasesTotal: number;
  purchasesLastHour: number;
  purchasesToday: number;
  notifySignups: number;
  activeWindowSeconds: number;
  updatedAt: string;
  gaConfigured: boolean;
  gaMeasurementId: string | null;
};

async function fetchStats(session: Session): Promise<AdminStats | null> {
  const res = await fetch('/api/admin/stats', {
    credentials: 'include',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('live');
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async (activeSession: Session) => {
    const data = await fetchStats(activeSession);
    if (!data) {
      setError('Could not load stats. Check you are signed in as the site owner.');
      setStats(null);
      return;
    }
    setError('');
    setStats(data);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) {
        void loadStats(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) void loadStats(next);
    });

    return () => subscription.unsubscribe();
  }, [loadStats]);

  useEffect(() => {
    if (!session || tab !== 'live') return;

    void loadStats(session);
    const timer = window.setInterval(() => {
      void loadStats(session);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [session, tab, loadStats]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setBusy(true);
    setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (signInError || !data.session) {
      setError(signInError?.message ?? 'Could not sign in.');
      return;
    }

    setSession(data.session);
    await loadStats(data.session);
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setStats(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-500">
              Private · Owner only
            </p>
            <h1 className="mt-2 text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-sm text-gray-500">
              Only visible when you sign in as {OWNER_EMAIL}. Not linked publicly.
            </p>
          </div>
          <Link href="/" className="text-sm text-gray-500 transition hover:text-white">
            ← Site
          </Link>
        </div>

        {!session ? (
          <form
            onSubmit={handleLogin}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8"
          >
            <h2 className="text-xl font-semibold">Owner sign in</h2>
            <p className="mt-2 text-sm text-gray-400">
              Sign in with your owner account to view live traffic, sales, and analytics.
            </p>
            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            <div className="mt-6 space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-white py-3 font-semibold text-black disabled:opacity-60"
              >
                {busy ? 'Signing in…' : 'View dashboard'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Signed in as <span className="text-gray-300">{session.user.email}</span>
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm text-gray-500 underline hover:text-white"
              >
                Sign out
              </button>
            </div>

            <div className="mb-6 flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
              <TabButton active={tab === 'live'} onClick={() => setTab('live')}>
                Live now
              </TabButton>
              <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')}>
                Google Analytics
              </TabButton>
            </div>

            {error && (
              <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            {tab === 'live' && stats && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard
                    label="On site now"
                    value={stats.activeOnSite}
                    hint={`Active in last ${stats.activeWindowSeconds}s`}
                    highlight
                  />
                  <StatCard
                    label="Watching stream"
                    value={stats.watchingStream}
                    hint="Paid viewers on stream page"
                    highlight
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Sales today" value={stats.purchasesToday} />
                  <StatCard label="Sales last hour" value={stats.purchasesLastHour} />
                  <StatCard label="Total sales" value={stats.purchasesTotal} />
                </div>

                <StatCard label="Notify-me signups" value={stats.notifySignups} />

                <p className="text-center text-xs text-gray-600">
                  Updates every 5s · Last refresh{' '}
                  {new Date(stats.updatedAt).toLocaleTimeString('en-GB')}
                </p>
              </div>
            )}

            {tab === 'analytics' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <h2 className="text-lg font-semibold">Google Analytics</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    Full history, traffic sources, and realtime reports live in your Google
                    Analytics account — only you can access that (your Google login).
                  </p>

                  {stats?.gaConfigured ? (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-green-400">
                        ✓ Tracking active ({stats.gaMeasurementId})
                      </p>
                      <a
                        href="https://analytics.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
                      >
                        Open Google Analytics →
                      </a>
                      <p className="text-xs text-gray-600">
                        In GA4 go to <span className="text-gray-400">Reports → Realtime</span> to
                        see users on the site right now.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <p className="text-sm font-medium text-amber-200">Not connected yet</p>
                      <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-400">
                        <li>
                          Go to{' '}
                          <a
                            href="https://analytics.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-400 underline"
                          >
                            analytics.google.com
                          </a>{' '}
                          and sign in with your Google account
                        </li>
                        <li>Create a property for <strong className="text-gray-300">ufcaccess.co.uk</strong></li>
                        <li>Copy your Measurement ID (starts with <code className="text-gray-300">G-</code>)</li>
                        <li>
                          In Railway → your project → <strong className="text-gray-300">Variables</strong>,
                          add{' '}
                          <code className="text-gray-300">NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX</code>
                        </li>
                        <li>Redeploy — tracking starts automatically</li>
                      </ol>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <h2 className="text-lg font-semibold">Live now tab</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    The <strong className="text-gray-300">Live now</strong> tab on this page shows
                    real-time visitor counts from your site (no Google account needed). Use both
                    together tonight — Live now for instant headcount, GA for full breakdown.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
        active ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${
        highlight
          ? 'border-red-500/40 bg-gradient-to-b from-red-950/40 to-zinc-950'
          : 'border-zinc-800 bg-zinc-900/50'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-3 font-mono text-4xl font-bold tabular-nums text-white sm:text-5xl">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-gray-600">{hint}</p>}
    </div>
  );
}
