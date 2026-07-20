// مكوّنات تحميل موحّدة (Skeleton) — تجربة تحميل أنعم من السبنر
const shimmer = "skeleton-shimmer"

export function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className={`h-5 rounded w-1/2 mb-2 ${shimmer}`} />
          <div className={`h-3 rounded w-1/3 ${shimmer}`} />
        </div>
        <div className={`h-6 w-20 rounded-full ${shimmer}`} />
      </div>
      <div className={`h-16 rounded-xl mb-3 ${shimmer}`} />
      <div className="flex gap-2">
        <div className={`h-4 w-16 rounded ${shimmer}`} />
        <div className={`h-4 w-16 rounded ${shimmer}`} />
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="h-3 skeleton-shimmer rounded w-2/3 mb-2" />
          <div className="h-7 skeleton-shimmer rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}
