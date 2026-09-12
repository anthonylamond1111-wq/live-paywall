import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Suspense } from 'react';
import GoogleAnalytics, { GoogleAnalyticsPageView } from '@/components/GoogleAnalytics';
import DiscordHelpLink from '@/components/DiscordHelpLink';
import SupportChatWidget from '@/components/SupportChatWidget';
import IntroSoundPreloader from '@/components/IntroSoundPreloader';
import SiteVisitorHeartbeat from '@/components/SiteVisitorHeartbeat';
import { SITE_NAME } from '@/lib/brand';
import { formatPreviewDuration, INTRO_SOUND_URL } from '@/lib/constants';
import { EVENT } from '@/lib/event';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.ufcaccess.co.uk';
const ogDescription = `${EVENT.number} — ${EVENT.fighter1Stats.name} vs ${EVENT.fighter2Stats.name}. Watch ${formatPreviewDuration()} preview free, then £2.50 for full HD live stream + chat. Works on phone & TV.`;

export const metadata: Metadata = {
  title: `${SITE_NAME} — ${EVENT.number} Live Stream`,
  description: ogDescription,
  metadataBase: new URL(siteUrl),
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: `${EVENT.number} — Free ${formatPreviewDuration(true)} Preview | ${SITE_NAME}`,
    description: ogDescription,
    url: siteUrl,
    siteName: SITE_NAME,
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${EVENT.number} — Free Preview + £2.50 Full Stream`,
    description: ogDescription,
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" href={INTRO_SOUND_URL} as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white">
        <IntroSoundPreloader />
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <GoogleAnalyticsPageView />
        </Suspense>
        <Suspense fallback={null}>
          <SiteVisitorHeartbeat />
        </Suspense>
        <div className="pointer-events-none fixed bottom-28 left-4 z-50">
          <DiscordHelpLink className="pointer-events-auto shadow-lg shadow-black/40" />
        </div>
        <SupportChatWidget />
        {children}
      </body>
    </html>
  );
}
