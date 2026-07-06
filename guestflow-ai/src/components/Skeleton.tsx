// Loading skeletons used by the dashboard loading.tsx files.
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function SkeletonPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <SkeletonBlock className="h-9 w-56" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonBlock key={i} className="h-28" />
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>
    </div>
  );
}
