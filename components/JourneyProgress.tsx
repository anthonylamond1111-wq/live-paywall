type JourneyStep = 'preview' | 'account' | 'pay' | 'watch';

const STEPS: { id: JourneyStep; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'account', label: 'Account' },
  { id: 'pay', label: 'Pay' },
  { id: 'watch', label: 'Watch' },
];

type JourneyProgressProps = {
  current: JourneyStep;
  onDark?: boolean;
};

function stepIndex(step: JourneyStep) {
  return STEPS.findIndex((s) => s.id === step);
}

export default function JourneyProgress({ current, onDark = false }: JourneyProgressProps) {
  const currentIdx = stepIndex(current);

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const done = index < currentIdx;
          const active = index === currentIdx;

          return (
            <div key={step.id} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      done || active ? 'bg-red-500' : onDark ? 'bg-white/15' : 'bg-zinc-800'
                    }`}
                  />
                )}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-9 sm:w-9 ${
                    done
                      ? 'bg-red-500 text-white'
                      : active
                        ? 'border-2 border-red-500 bg-red-500/10 text-red-400'
                        : onDark
                          ? 'border border-white/20 bg-black/40 text-gray-400'
                          : 'border border-zinc-700 bg-zinc-900 text-gray-600'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${done ? 'bg-red-500' : onDark ? 'bg-white/15' : 'bg-zinc-800'}`}
                  />
                )}
              </div>
              <span
                className={`mt-2 text-[10px] uppercase tracking-wider sm:text-xs ${
                  active
                    ? 'text-red-400'
                    : done
                      ? onDark
                        ? 'text-gray-300'
                        : 'text-gray-400'
                      : onDark
                        ? 'text-gray-500'
                        : 'text-gray-600'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
