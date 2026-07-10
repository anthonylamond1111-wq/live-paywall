'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EVENT } from '@/lib/event';
import SiteFooter from '@/components/SiteFooter';
import FAQ from '@/components/FAQ';

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent('UFC Access Support');
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    window.location.href = `mailto:${EVENT.supportEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-[100dvh] bg-black px-4 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-red-400 hover:underline">
          ← Back to UFC Access
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Support</h1>
        <p className="mt-2 text-sm text-gray-400">
          Need help on fight night? We&apos;re here. Email{' '}
          <a href={`mailto:${EVENT.supportEmail}`} className="text-red-400 hover:underline">
            {EVENT.supportEmail}
          </a>
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <input
            type="text"
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
          />
          <input
            type="email"
            required
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
          />
          <textarea
            required
            rows={4}
            placeholder="How can we help?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-gray-100"
          >
            Send via email
          </button>
        </form>

        <div className="mt-10">
          <FAQ />
        </div>

        <SiteFooter />
      </div>
    </div>
  );
}
