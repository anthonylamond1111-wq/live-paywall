import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';

export default function TermsPage() {
  return (
    <div className="min-h-[100dvh] bg-black px-4 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-red-400 hover:underline">
          ← Back to UFC Access
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Terms of Service</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-400">
          <p>
            UFC Access provides private live stream access on a pay-per-event basis. By purchasing
            access, you agree to use the service for personal viewing only.
          </p>
          <p>
            Streams may not be recorded, redistributed, or rebroadcast. Access is tied to your
            account and may not be shared.
          </p>
          <p>
            We are not affiliated with UFC or any official broadcast partner. Service availability
            depends on technical conditions on event night.
          </p>
        </div>
        <SiteFooter />
      </div>
    </div>
  );
}
