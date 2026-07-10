export default function PaymentBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
      <BadgeStripe />
      <BadgeApplePay />
      <BadgeGooglePay />
    </div>
  );
}

function BadgeStripe() {
  return (
    <div className="flex h-8 items-center rounded-md border border-zinc-700 bg-zinc-900 px-3">
      <span className="text-sm font-bold tracking-tight text-[#635BFF]">stripe</span>
    </div>
  );
}

function BadgeApplePay() {
  return (
    <div className="flex h-8 items-center rounded-md border border-zinc-700 bg-black px-3">
      <span className="text-sm font-medium text-white">
        <span className="font-normal">Pay</span>
      </span>
      <svg className="ml-1 h-4 w-4" viewBox="0 0 24 24" fill="white">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    </div>
  );
}

function BadgeGooglePay() {
  return (
    <div className="flex h-8 items-center rounded-md border border-zinc-700 bg-white px-3">
      <span className="text-xs font-medium text-gray-800">G Pay</span>
    </div>
  );
}
