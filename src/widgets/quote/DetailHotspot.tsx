"use client";

type DetailHotspotProps = {
  className: string;
  active: boolean;
  preview?: boolean;
  label: string;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  showInactive?: boolean;
};

export function detailHotspotSurface(active: boolean, interactive: boolean, preview = false): string {
  if (active) {
    return [
      "absolute z-20 border-2 transition-all duration-200",
      interactive ? "cursor-pointer" : "pointer-events-none",
      "border-zinc-100/90 bg-zinc-400/40 shadow-[0_0_0_2px_rgba(228,228,231,0.5)_inset,0_0_24px_rgba(167,139,250,0.45)]",
    ].join(" ");
  }

  if (preview) {
    return [
      "absolute z-[15] border transition-all duration-200",
      interactive ? "cursor-pointer" : "pointer-events-none",
      "border-violet-200/55 bg-violet-400/20 shadow-[0_0_0_1px_rgba(192,132,252,0.3)_inset,0_0_14px_rgba(192,132,252,0.24)]",
    ].join(" ");
  }

  return [
    "absolute border transition-all duration-200",
    interactive ? "cursor-pointer" : "pointer-events-none",
    "z-[1] border-zinc-400/30 bg-zinc-500/10 hover:border-zinc-200/50 hover:bg-zinc-400/18",
  ].join(" ");
}

export function DetailHotspot({
  className,
  active,
  preview = false,
  label,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  showInactive = true,
}: DetailHotspotProps) {
  if (!active && !preview && !showInactive) return null;

  const surface = detailHotspotSurface(active, Boolean(onClick), preview);
  const interactive = Boolean(onClick);

  const content = active || preview ? (
    <span
      className={[
        "pointer-events-none absolute inset-x-1 bottom-1 z-20 rounded-md border px-1.5 py-0.5 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.08em]",
        active
          ? "border-zinc-300/45 bg-zinc-950/95 text-zinc-50"
          : "border-violet-300/35 bg-zinc-950/85 text-violet-100",
      ].join(" ")}
    >
      {label}
    </span>
  ) : null;

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-label={label}
        aria-pressed={active}
        className={[surface, "body-map-hotspot touch-manipulation", className].join(" ")}
      >
        {content}
      </button>
    );
  }

  return (
    <div aria-hidden className={[surface, className].join(" ")}>
      {content}
    </div>
  );
}
