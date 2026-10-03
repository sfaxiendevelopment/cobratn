import ProductCard from './ProductCard'
import { ProductGridSkeleton } from './LoadingSkeleton'

export default function ProductGrid({ products, loading = false, skeletonCount = 8, className = '' }) {
  if (loading) return <ProductGridSkeleton count={skeletonCount} />
  if (!products?.length) return null
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4 ${className}`}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} eager={i < 4} />
      ))}
    </div>
  )
}