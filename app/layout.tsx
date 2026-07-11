import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Suspense } from 'react';
import GoogleAnalytics, { GoogleAnalyticsPageView } from '@/components/GoogleAnalytics';
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
const ogDescription =
  'UFC 329 — McGregor vs Holloway. Watch 60 seconds free, then £2.50 for full HD live stream + chat. Works on phone & TV.';

export const metadata: Metadata = {
  title: 'UFC Access — UFC 329 Live Stream',
  description: ogDescription,
  metadataBase: new URL(siteUrl),
  applicationName: 'UFC Access',
  appleWebApp: {
    capable: true,
    title: 'UFC Access',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'UFC 329 — Free 60 Sec Preview | UFC Access',
    description: ogDescription,
    url: siteUrl,
    siteName: 'UFC Access',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UFC 329 — Free Preview + £2.50 Full Stream',
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
      <body className="min-h-full flex flex-col bg-black text-white">
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <GoogleAnalyticsPageView />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
