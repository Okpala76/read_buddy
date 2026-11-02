"use client";
export function ReaderHeader({
  title,
  status,
  busy,
  onClose,
}: {
  title: string;
  status: string;
  busy?: boolean;
  onClose: () => void;
}) {
  return (
    <header className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p role="status" className="text-muted-foreground text-xs">
          {status}
        </p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onClose}
        className="motion-press border-border min-h-11 rounded-lg border px-3 text-sm disabled:opacity-50"
      >
        Finish / Close
      </button>
    </header>
  );
}
export function ReaderNavigation({
  label,
  previous,
  next,
  disablePrevious,
  disableNext,
}: {
  label: string;
  previous: () => void;
  next: () => void;
  disablePrevious: boolean;
  disableNext: boolean;
}) {
  return (
    <footer className="border-border flex items-center justify-center gap-3 border-t px-4 py-3">
      <button
        type="button"
        onClick={previous}
        disabled={disablePrevious}
        className="motion-press border-border min-h-11 rounded-lg border px-3 text-sm disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-center text-sm tabular-nums" aria-live="polite">
        {label}
      </span>
      <button
        type="button"
        onClick={next}
        disabled={disableNext}
        className="motion-press border-border min-h-11 rounded-lg border px-3 text-sm disabled:opacity-40"
      >
        Next
      </button>
    </footer>
  );
}
