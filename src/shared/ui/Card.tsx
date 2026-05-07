import { cn } from "@/shared/lib/cn";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "app-surface noise rounded-2xl overflow-hidden shadow-[0_20px_60px_-40px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

