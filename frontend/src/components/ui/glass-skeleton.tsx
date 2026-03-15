"use client";

import { cn } from "@/lib/utils";

interface GlassSkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function GlassSkeleton({ className, style }: GlassSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white/[0.03] border border-white/[0.04] overflow-hidden relative",
        className
      )}
      style={style}
    >
      <div className="absolute inset-0 shimmer-glass" />
    </div>
  );
}

/** Skeleton for a SongCard-shaped result */
export function SongCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <GlassSkeleton className="w-12 h-12 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <GlassSkeleton className="h-4 w-3/4 rounded-md" />
          <GlassSkeleton className="h-3 w-1/2 rounded-md" />
        </div>
        <GlassSkeleton className="w-10 h-10 rounded-full shrink-0" />
      </div>
      <div className="flex gap-2">
        <GlassSkeleton className="h-6 w-16 rounded-full" />
        <GlassSkeleton className="h-6 w-20 rounded-full" />
        <GlassSkeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

/** Skeleton for a LyricCard-shaped result */
export function LyricCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-4 border-l-2 border-white/[0.06]">
      <div className="space-y-2">
        <GlassSkeleton className="h-4 w-full rounded-md" />
        <GlassSkeleton className="h-4 w-5/6 rounded-md" />
        <GlassSkeleton className="h-4 w-2/3 rounded-md" />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <GlassSkeleton className="w-6 h-6 rounded-md shrink-0" />
        <GlassSkeleton className="h-3 w-24 rounded-md" />
      </div>
    </div>
  );
}

/** Skeleton for the chat message loading state */
export function ChatMessageSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <GlassSkeleton className="w-7 h-7 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <GlassSkeleton className="h-4 w-full rounded-md" />
          <GlassSkeleton className="h-4 w-4/5 rounded-md" />
          <GlassSkeleton className="h-4 w-3/5 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for the deep dive page */
export function DeepDiveSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06]">
        <GlassSkeleton className="w-8 h-8 rounded-lg" />
        <GlassSkeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <GlassSkeleton className="h-4 w-40 rounded-md" />
          <GlassSkeleton className="h-3 w-28 rounded-md" />
        </div>
      </div>
      {/* Content skeleton */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6 space-y-4">
          {[65, 82, 55, 90, 70, 78, 60, 85].map((w, i) => (
            <div key={i} className="flex gap-3">
              <GlassSkeleton className="w-6 h-6 rounded-md shrink-0" />
              <GlassSkeleton className="h-5 rounded-md" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
        <div className="hidden lg:block w-[340px] border-l border-white/[0.06] p-4 space-y-4">
          <GlassSkeleton className="h-48 w-full rounded-xl" />
          <GlassSkeleton className="h-4 w-3/4 rounded-md" />
          <GlassSkeleton className="h-4 w-1/2 rounded-md" />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <GlassSkeleton className="h-16 rounded-lg" />
            <GlassSkeleton className="h-16 rounded-lg" />
            <GlassSkeleton className="h-16 rounded-lg" />
            <GlassSkeleton className="h-16 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
