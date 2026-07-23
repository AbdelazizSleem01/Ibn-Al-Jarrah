import React from "react";

export default function Loading() {
  return (
    <div className="mx-auto px-4 py-8 text-right min-h-screen">
      {/* Page Title & Controls Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-20 skeleton rounded" />
          <div className="h-8 w-48 skeleton rounded" />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Toggle Filters Button Skeleton */}
          <div className="h-10 w-32 skeleton rounded-lg" />
          {/* View Mode Toggle Skeleton */}
          <div className="h-10 w-24 skeleton rounded-lg" />
        </div>
      </div>

      {/* Results Info Skeleton */}
      <div className="h-4 w-28 skeleton rounded mb-6" />

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-card-bg border border-border-color rounded-xl overflow-hidden shadow-sm p-4 flex flex-col gap-3"
          >
            <div className="aspect-[3/4] w-full skeleton rounded-lg" />
            <div className="h-5 w-3/4 skeleton rounded" />
            <div className="h-4 w-1/2 skeleton rounded" />
            <div className="h-4 w-1/3 skeleton rounded mt-2" />
            <div className="h-8 w-full skeleton rounded-lg mt-2 md:hidden" />
          </div>
        ))}
      </div>
    </div>
  );
}
