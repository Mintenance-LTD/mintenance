export function DiscoverSkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="w-11 h-11 bg-gray-200 rounded-full flex-shrink-0" />
        </div>
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="space-y-1.5">
          <div className="h-3 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-4/5" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-5 bg-gray-200 rounded-full w-16" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-8 bg-gray-200 rounded-lg flex-1" />
          <div className="h-8 bg-gray-200 rounded-lg w-9 flex-shrink-0" />
          <div className="h-8 bg-gray-200 rounded-lg w-9 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
