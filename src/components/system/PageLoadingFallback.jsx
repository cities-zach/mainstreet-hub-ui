export default function PageLoadingFallback({ compact = false }) {
  return (
    <div
      className={`flex items-center justify-center bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400 ${
        compact ? "min-h-[40vh]" : "min-h-screen"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#835879]" aria-hidden="true" />
        Loading MainSuite…
      </div>
    </div>
  );
}
