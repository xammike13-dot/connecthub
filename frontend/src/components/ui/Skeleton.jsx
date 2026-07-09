import { motion } from 'framer-motion';

const Skeleton = ({ className = '', variant = 'rectangular' }) => {
  const baseStyles = 'bg-neutral-200 animate-pulse';
  
  const variants = {
    rectangular: `rounded ${className}`,
    circular: `rounded-full ${className}`,
    text: `rounded h-4 ${className}`,
    image: `rounded-lg ${className}`,
  };

  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{
        repeat: Infinity,
        repeatType: 'reverse',
        duration: 0.8,
      }}
      className={`${baseStyles} ${variants[variant]}`}
    />
  );
};

// Pre-built skeleton components
export const SkeletonCard = () => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden border border-neutral-200">
    <Skeleton className="w-full h-48" variant="image" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-6 w-3/4" variant="text" />
      <Skeleton className="h-4 w-full" variant="text" />
      <Skeleton className="h-4 w-2/3" variant="text" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-5 w-24" variant="text" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  </div>
);

export const SkeletonList = ({ count = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton className="w-12 h-12 flex-shrink-0" variant="circular" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" variant="text" />
          <Skeleton className="h-3 w-1/2" variant="text" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="space-y-3">
    <div className="flex space-x-4 pb-2">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" variant="text" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-4 flex-1" variant="text" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonDashboard = () => (
  <div className="space-y-6">
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-md p-4 border border-neutral-200">
          <Skeleton className="h-4 w-24 mb-2" variant="text" />
          <Skeleton className="h-8 w-32" variant="text" />
        </div>
      ))}
    </div>
    
    {/* Chart Area */}
    <div className="bg-white rounded-xl shadow-md p-4 border border-neutral-200">
      <Skeleton className="h-6 w-48 mb-4" variant="text" />
      <Skeleton className="h-64 w-full" variant="rectangular" />
    </div>
    
    {/* Recent Activity */}
    <div className="bg-white rounded-xl shadow-md p-4 border border-neutral-200">
      <Skeleton className="h-6 w-48 mb-4" variant="text" />
      <SkeletonList count={5} />
    </div>
  </div>
);

export default Skeleton;