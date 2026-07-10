import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'UFC Access — Live Stream',
  description: 'Private live UFC stream access. HD broadcast, live chat, and account-based viewing.',
  metadataBase: new URL(siteUrl),
  applicationName: 'UFC Access',
  appleWebApp: {
    capable: true,
    title: 'UFC Access',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'UFC Access — Live Stream',
    description: 'Watch the live event. HD stream and live chat for paid viewers.',
    url: siteUrl,
    siteName: 'UFC Access',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UFC Access — Live Stream',
    description: 'Watch the live event. HD stream and live chat for paid viewers.',
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
      <body className="min-h-full flex flex-col bg-black text-white">{children}</body>
    </html>
  );
}
