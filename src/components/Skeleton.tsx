export const SkeletonBlock = ({ lines = 3, className = '' }: { lines?: number; className?: string }) => (
  <div className={`animate-pulse space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="h-3 bg-surface-container rounded-lg" style={{ width: `${70 + Math.random() * 30}%` }} />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div className="bg-card-bg border border-outline-variant rounded-2xl p-6 animate-pulse">
    <div className="h-4 w-1/3 bg-surface-container rounded-lg mb-4" />
    <div className="space-y-2">
      <div className="h-3 bg-surface-container rounded-lg w-3/4" />
      <div className="h-3 bg-surface-container rounded-lg w-1/2" />
      <div className="h-3 bg-surface-container rounded-lg w-2/3" />
    </div>
  </div>
);
