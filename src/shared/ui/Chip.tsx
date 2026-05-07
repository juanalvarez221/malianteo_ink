import { cn } from "@/shared/lib/cn";

type ChipProps = {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
};

export function Chip({ children, active, className, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition",
        active
          ? "border-violet-500/30 bg-violet-600/15 text-violet-100"
          : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/7",
        className,
      )}
    >
      {children}
    </button>
  );
}

