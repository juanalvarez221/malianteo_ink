import { cn } from "@/shared/lib/cn";

export function SectionTitle({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.18em] text-violet-200/70 uppercase">
          {subtitle ?? "Malianteo Ink"}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-50">{title}</h2>
      </div>
    </div>
  );
}

