import { cn } from "@/utils/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("bg-white/5 animate-pulse rounded-xl", className)}
    />
  );
}

export function ConversationListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2 px-3 mt-1">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex self-start mr-auto">
      <div className="bg-gray-800/80 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm border border-gray-700/50">
        <div
          className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
