'use client';

type DiscountCodeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function DiscountCodeField({
  value,
  onChange,
  disabled = false,
}: DiscountCodeFieldProps) {
  return (
    <div className="mt-5 rounded-xl border border-zinc-800 bg-black/40 p-4">
      <label htmlFor="discount-code" className="block text-sm font-medium text-gray-300">
        Have a discount code?
      </label>
      <p className="mt-1 text-xs text-gray-500">Optional — applied at checkout</p>
      <input
        id="discount-code"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        disabled={disabled}
        placeholder="Enter code"
        autoComplete="off"
        spellCheck={false}
        className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm uppercase tracking-wide text-white outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-600 focus:border-red-500 disabled:opacity-60"
      />
    </div>
  );
}
