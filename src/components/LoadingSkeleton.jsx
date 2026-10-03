import { cn } from '../lib/utils'

/**
 * Professional skeleton loaders. Pure CSS, no external lib.
 */

export function SkeletonBlock({ className }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />
}

export function ProductCardSkeleton() {
  return (
    <div className="pcard">
      <SkeletonBlock className="aspect-[4/5] w-full" />
      <div className="mt-4 space-y-2">
        <SkeletonBlock className="h-3 w-3/4" />
        <SkeletonBlock className="h-3 w-1/4" />
        <SkeletonBlock className="h-4 w-full" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProductPageSkeleton() {
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-2 lg:gap-14">
      <SkeletonBlock className="aspect-[4/5] w-full" />
      <div className="space-y-5">
        <SkeletonBlock className="h-8 w-2/3" />
        <SkeletonBlock className="h-5 w-1/3" />
        <SkeletonBlock className="h-4 w-1/2" />
        <SkeletonBlock className="h-4 w-1/2" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-32 w-full" />
      </div>
    </div>
  )
}

export function AccountSkeleton() {
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-4 w-1/2" />
        <SkeletonBlock className="h-4 w-2/3" />
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-6 w-1/2" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
    </div>
  )
}

export function OrderSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-5 w-1/3" />
      <SkeletonBlock className="h-28 w-full" />
      <SkeletonBlock className="h-28 w-full" />
    </div>
  )
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-24 w-full" />
        ))}
      </div>
      <SkeletonBlock className="h-64 w-full" />
      <SkeletonBlock className="h-40 w-full" />
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full">
      <SkeletonBlock className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-black/5 py-3">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBlock key={j} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}