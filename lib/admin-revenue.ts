import { getStripe } from '@/lib/stripe';
import { getStreamAccessStartedAtUnix } from '@/lib/stream-access';

export type EventRevenue = {
  revenueTotalPence: number;
  revenueTodayPence: number;
  revenueLastHourPence: number;
  stripeFeesPence: number;
  fixedCostsPence: number;
  profitPence: number;
};

/** UK Stripe card fee estimate: 1.4% + 20p per successful payment. */
function estimateStripeFeePence(amountPence: number): number {
  if (amountPence <= 0) return 0;
  return Math.round(amountPence * 0.014 + 20);
}

export async function getEventRevenue(): Promise<EventRevenue> {
  const stripe = getStripe();
  const since = getStreamAccessStartedAtUnix();
  const oneHourAgo = Math.floor(Date.now() / 1000) - 60 * 60;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayUnix = Math.floor(todayStart.getTime() / 1000);

  let revenueTotalPence = 0;
  let revenueTodayPence = 0;
  let revenueLastHourPence = 0;
  let stripeFeesPence = 0;

  let startingAfter: string | undefined;

  for (let page = 0; page < 20; page++) {
    const sessions = await stripe.checkout.sessions.list({
      status: 'complete',
      limit: 100,
      created: { gte: since },
      starting_after: startingAfter,
    });

    for (const session of sessions.data) {
      if (session.payment_status !== 'paid' || session.created < since) continue;

      const amount = session.amount_total ?? 0;
      revenueTotalPence += amount;
      stripeFeesPence += estimateStripeFeePence(amount);

      if (session.created >= todayUnix) revenueTodayPence += amount;
      if (session.created >= oneHourAgo) revenueLastHourPence += amount;
    }

    if (!sessions.has_more || sessions.data.length === 0) break;
    startingAfter = sessions.data[sessions.data.length - 1].id;
  }

  const fixedCostsPence = Math.round(
    Math.max(0, Number(process.env.ADMIN_FIXED_COSTS_GBP ?? '0')) * 100
  );

  return {
    revenueTotalPence,
    revenueTodayPence,
    revenueLastHourPence,
    stripeFeesPence,
    fixedCostsPence,
    profitPence: revenueTotalPence - stripeFeesPence - fixedCostsPence,
  };
}

export function formatGbpFromPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}
