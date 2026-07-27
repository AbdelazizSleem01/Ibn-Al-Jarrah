import React from "react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-right">
      {/* Navbar Skeleton Placeholder */}
      <header className="h-16 md:h-20 bg-card-bg border-b border-border-color shadow-sm px-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 skeleton rounded-full shrink-0" />
          <div className="h-6 w-40 skeleton rounded-lg" />
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <div className="h-4 w-16 skeleton rounded-md" />
          <div className="h-4 w-16 skeleton rounded-md" />
          <div className="h-4 w-16 skeleton rounded-md" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full flex flex-col gap-6">
        {/* Page Title & Controls Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-24 skeleton rounded-lg" />
            <div className="h-9 w-56 skeleton rounded-xl" />
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="h-10 w-36 skeleton rounded-xl" />
            <div className="h-10 w-28 skeleton rounded-xl" />
          </div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="h-12 w-full skeleton rounded-xl" />

        {/* Cards Grid Skeleton matching BookCard dimensions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-card-bg border border-border-color rounded-xl overflow-hidden shadow-sm p-4 flex flex-col gap-3 min-h-[380px]"
            >
              <div className="aspect-[3/4] w-full skeleton rounded-lg" />
              <div className="h-5 w-4/5 skeleton rounded-md" />
              <div className="h-4 w-3/5 skeleton rounded-md" />
              <div className="h-4 w-2/5 skeleton rounded-md" />
              <div className="mt-auto pt-3 border-t border-border-color/40 flex items-center justify-between">
                <div className="h-5 w-24 skeleton rounded-md" />
                <div className="h-6 w-16 skeleton rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
