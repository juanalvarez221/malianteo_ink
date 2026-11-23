/**
 * Resumen de selecciones conceptuales (chips / barra / indicador compacto).
 */

"use client";

import { X } from "lucide-react";
import { getSelectionDisplayLabel } from "@/widgets/body-3d/interaction/bodyInteractionLabels";

type BodySelectionSummaryProps = {
  selectedTargetIds: readonly string[];
  onRemove: (targetId: string) => void;
  onClear: () => void;
  variant?: "bar" | "stacked" | "compact";
  onCompactOpen?: () => void;
  /** Tocar el nombre de una zona: enfocarla en el modelo. */
  onFocusItem?: (targetId: string) => void;
  className?: string;
  emptyHint?: string;
  /** Clase para ocultar según breakpoint (p. ej. panel desktop). */
  hideFromClassName?: string;
};

export function BodySelectionSummary({
  selectedTargetIds,
  onRemove,
  onClear,
  variant = "bar",
  onCompactOpen,
  onFocusItem,
  className = "",
  emptyHint = "Gira el modelo y toca una zona para comenzar.",
  hideFromClassName = "",
}: BodySelectionSummaryProps) {
  const count = selectedTargetIds.length;

  if (variant === "compact") {
    if (count === 0) return null;
    return (
      <button
        type="button"
        onClick={onCompactOpen}
        className={[
          "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-[rgba(168,85,247,0.35)] bg-[rgba(5,5,8,0.9)] px-4 text-sm font-semibold text-[rgba(240,234,255,0.95)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-[rgba(168,85,247,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(168,85,247,0.7)] active:scale-[0.98]",
          hideFromClassName,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[rgba(168,85,247,0.85)] px-1.5 text-[11px] font-bold tabular-nums text-white">
          {count}
        </span>
        {count === 1 ? "zona elegida" : "zonas elegidas"}
      </button>
    );
  }

  if (count === 0) {
    return (
      <div
        className={[
          "rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-3",
          hideFromClassName,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Tu selección
        </p>
        <p className="mt-1.5 text-sm text-zinc-500">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-2xl border border-white/10 bg-[rgba(5,5,8,0.9)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md",
        hideFromClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(167,139,250,0.9)]">
          Tu selección
          <span className="ml-1.5 text-zinc-500">· {count}</span>
        </p>
        {count > 1 ? (
          <button
            type="button"
            onClick={onClear}
            className="min-h-10 rounded-lg px-2 text-xs font-semibold text-zinc-400 transition hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(168,85,247,0.7)]"
          >
            Limpiar
          </button>
        ) : null}
      </div>
      <ul
        className={[
          "mt-3",
          variant === "bar"
            ? "flex max-h-[5.25rem] flex-wrap gap-2 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:thin]"
            : "flex flex-col gap-2",
        ].join(" ")}
      >
        {selectedTargetIds.map((id) => (
          <li key={id} className={variant === "bar" ? "max-w-full" : undefined}>
            <span
              className={[
                "inline-flex max-w-full items-center gap-1.5 border border-[rgba(168,85,247,0.32)] bg-[rgba(168,85,247,0.12)] pl-3.5 pr-1 text-sm text-[rgba(240,234,255,0.97)]",
                variant === "stacked"
                  ? "w-full justify-between rounded-xl py-2"
                  : "min-h-10 rounded-full",
              ].join(" ")}
            >
              {onFocusItem ? (
                <button
                  type="button"
                  onClick={() => onFocusItem(id)}
                  title="Ver en el modelo"
                  className="min-w-0 truncate rounded text-left font-medium tracking-tight transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(168,85,247,0.7)]"
                >
                  {getSelectionDisplayLabel(id)}
                </button>
              ) : (
                <span className="truncate font-medium tracking-tight">
                  {getSelectionDisplayLabel(id)}
                </span>
              )}
              <button
                type="button"
                aria-label={`Quitar ${getSelectionDisplayLabel(id)}`}
                onClick={() => onRemove(id)}
                className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-black/35 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(168,85,247,0.7)] active:scale-[0.96]"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
