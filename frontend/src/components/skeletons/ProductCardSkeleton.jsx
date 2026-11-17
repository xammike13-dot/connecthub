// frontend/src/components/skeletons/ProductCardSkeleton.jsx
// Skeleton loader matching ProductCard dimensions for flicker-free data fetching

export default function ProductCardSkeleton({ isGrid = false, className = '' }) {
  const containerClasses = isGrid
    ? `relative w-full min-w-0 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm flex flex-col ${className}`
    : `relative flex-shrink-0 min-w-[160px] w-[160px] md:min-w-[190px] md:w-[190px] bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm snap-start flex flex-col ${className}`;

  return (
    <div className={containerClasses}>
      {/* 1. Square Image Placeholder */}
      <div className="relative w-full aspect-square bg-gray-200 animate-pulse overflow-hidden flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-gray-300/50" />
      </div>

      {/* 2. Details Placeholder */}
      <div className="flex flex-col flex-1 p-3 md:p-3.5 justify-between gap-2.5">
        <div className="space-y-1.5">
          {/* Title lines */}
          <div className="h-3.5 bg-gray-200 rounded-md w-full animate-pulse" />
          <div className="h-3.5 bg-gray-200 rounded-md w-3/4 animate-pulse" />

          {/* Rating & Vendor row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="h-3 bg-gray-200 rounded w-14 animate-pulse" />
            <div className="h-2.5 bg-gray-200 rounded w-16 animate-pulse" />
          </div>
        </div>

        {/* 3. Pricing & Button row */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="space-y-1">
            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
            <div className="h-2.5 bg-gray-200 rounded w-10 animate-pulse" />
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
