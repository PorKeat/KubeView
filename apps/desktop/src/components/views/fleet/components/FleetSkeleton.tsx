export function FleetSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      data-testid="fleet-loading"
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({
        length: Math.min(Math.max(count, 1), 6),
      }).map((_, index) => (
        <div
          key={index}
          className="h-[280px] animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-black/5 dark:bg-white/5" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-2.5 w-2/3 rounded bg-black/5 dark:bg-white/5" />
              <div className="h-2 w-1/2 rounded bg-black/5 dark:bg-white/5" />
            </div>
          </div>
          <div className="mt-4 h-7 rounded-md bg-black/5 dark:bg-white/5" />
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {Array.from({ length: 3 }).map((__, statIndex) => (
              <div
                key={statIndex}
                className="h-16 rounded-lg bg-black/5 dark:bg-white/5"
              />
            ))}
          </div>
          <div className="mt-4 h-2 rounded-full bg-black/5 dark:bg-white/5" />
          <div className="mt-2 h-2 rounded-full bg-black/5 dark:bg-white/5" />
        </div>
      ))}
    </div>
  );
}
