// مكوّنات تحميل موحّدة (Skeleton) — تجربة تحميل أنعم من السبنر
export function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="h-5 bg-slate-200 rounded w-1/2 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-1/3" />
        </div>
        <div className="h-6 w-20 bg-slate-100 rounded-full" />
      </div>
      <div className="h-16 bg-slate-100 rounded-xl mb-3" />
      <div className="flex gap-2">
        <div className="h-4 w-16 bg-slate-100 rounded" />
        <div className="h-4 w-16 bg-slate-100 rounded" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="h-3 bg-slate-100 rounded w-2/3 mb-2" />
          <div className="h-7 bg-slate-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}
