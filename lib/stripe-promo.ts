import { getStripe } from '@/lib/stripe';

export async function resolvePromotionCodeId(code: string): Promise<string | null> {
  const normalized = code.trim();
  if (!normalized) return null;

  const stripe = getStripe();
  const { data } = await stripe.promotionCodes.list({
    code: normalized,
    active: true,
    limit: 1,
  });

  const match = data.find(
    (entry) => entry.code.toLowerCase() === normalized.toLowerCase()
  );

  return match?.id ?? null;
}
