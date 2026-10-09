export default function ProductLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <header className="space-y-2">
        <div className="bg-muted h-4 w-28 animate-pulse rounded motion-reduce:animate-none" />
        <div className="bg-muted h-9 w-52 animate-pulse rounded motion-reduce:animate-none" />
        <div className="bg-muted h-5 max-w-lg animate-pulse rounded motion-reduce:animate-none" />
      </header>
      <div className="border-border bg-card space-y-4 rounded-xl border p-6">
        <div className="bg-muted h-6 w-48 animate-pulse rounded motion-reduce:animate-none" />
        <div className="bg-muted h-24 animate-pulse rounded-lg motion-reduce:animate-none" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="border-border bg-card space-y-4 rounded-xl border p-6"
          >
            <div className="bg-muted h-6 w-36 animate-pulse rounded motion-reduce:animate-none" />
            <div className="bg-muted h-20 animate-pulse rounded-lg motion-reduce:animate-none" />
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading your reading data
      </span>
    </div>
  );
}
