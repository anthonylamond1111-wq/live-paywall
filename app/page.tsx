'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getSupabaseClient } from '@/lib/supabase/client';

const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false });

export default function UFCAccess() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const hlsUrl = "https://livepeercdn.studio/hls/7d50dwagchjrclo2/index.m3u8";

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsUnlocked(true);
    });
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      alert('Please enter your email and password.');
      return;
    }

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        alert('Supabase is not configured. In Railway → your service → Variables, add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.');
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        else setIsUnlocked(true);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert('Check your email for confirmation!');
      }
    } catch {
      alert('Could not reach Supabase. Check your environment variables in Railway and redeploy.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />

      <nav className="fixed top-0 w-full bg-black/90 backdrop-blur-md border-b border-red-600 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex justify-between items-center">
          <div className="text-4xl font-black tracking-[-2px]">UFC ACCESS</div>
          <div className="text-red-500 text-sm font-mono tracking-widest">AUTHORIZED LIVE</div>
        </div>
      </nav>

      <main className="relative pt-32 pb-20 max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="text-red-500 text-sm tracking-[4px] mb-6">UFC 329 • LIVE EVENT</div>
          <h1 className="text-7xl md:text-8xl font-black tracking-[-3px] leading-none mb-6">
            MCGREGOR<br />VS HOLLOWAY
          </h1>
          <p className="text-2xl text-gray-400">THE NOTORIOUS RETURNS</p>
        </div>

        {!isUnlocked ? (
          <div className="max-w-md mx-auto bg-zinc-900 border border-red-600/50 rounded-3xl p-10">
            <h2 className="text-3xl font-bold text-center mb-8">{isLogin ? "Login" : "Create Account"}</h2>
            
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-black border border-zinc-700 rounded-xl mb-4"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-black border border-zinc-700 rounded-xl mb-6"
            />

            <button onClick={handleAuth} className="w-full py-4 bg-red-600 rounded-xl font-bold mb-4">
              {isLogin ? "LOGIN" : "SIGN UP"}
            </button>

            <button onClick={() => setIsLogin(!isLogin)} className="text-red-500 text-sm">
              {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
            </button>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden border-4 border-red-600 shadow-2xl">
            <MuxPlayer
              src={hlsUrl}
              streamType="live"
              autoPlay
              muted
              playsInline
              className="w-full aspect-video"
            />
          </div>
        )}
      </main>
    </div>
  );
}