import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import { EVENT } from '@/lib/event';

export default function RefundPage() {
  return (
    <div className="min-h-[100dvh] bg-black px-4 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-red-400 hover:underline">
          ← Back to UFC Access
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Refund Policy</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-400">
          <p>
            If the live stream is unavailable for a significant portion of the event due to a fault
            on our side, contact us at{' '}
            <a href={`mailto:${EVENT.supportEmail}`} className="text-red-400 hover:underline">
              {EVENT.supportEmail}
            </a>{' '}
            within 24 hours for a refund review.
          </p>
          <p>
            Refunds are not available once you have successfully watched the stream, or if issues
            are caused by your device, internet connection, or third-party payment provider.
          </p>
        </div>
        <SiteFooter />
      </div>
    </div>
  );
}
