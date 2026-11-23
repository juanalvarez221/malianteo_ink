/**
 * Tooltip flotante de hover (desktop) — shortLabel público + placement inteligente.
 */

"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { stripCoverageToken } from "@/widgets/body-3d/domain/bodyPublicSelectionCatalog";
import { getPrimaryPublicSelectionTarget } from "@/widgets/body-3d/domain/bodyPublicSelectionRouting";
import { getPublicShortLabel } from "@/widgets/body-3d/domain/bodyPublicRegionMeta";
import { placeHoverTooltip } from "@/widgets/body-3d/ux/bodySelectorLayout";

type BodyHoverTooltipProps = {
  atomicZoneId: string | null;
  pointer: { x: number; y: number } | null;
  visible: boolean;
  /** Para marcar "En tu selección" cuando la zona ya está elegida. */
  selectedTargetIds?: readonly string[];
};

export function BodyHoverTooltip({
  atomicZoneId,
  pointer,
  visible,
  selectedTargetIds = [],
}: BodyHoverTooltipProps) {
  const placement = useMemo(() => {
    if (!pointer || typeof window === "undefined") return null;
    return placeHoverTooltip(
      pointer.x,
      pointer.y,
      window.innerWidth,
      window.innerHeight,
    );
  }, [pointer]);

  if (!visible || !atomicZoneId || !pointer || !placement) return null;

  const primary =
    getPrimaryPublicSelectionTarget(atomicZoneId) ?? atomicZoneId;
  const label = getPublicShortLabel(primary);
  const inSelection = selectedTargetIds.some(
    (id) => stripCoverageToken(id).regionId === primary,
  );

  return (
    <div
      role="tooltip"
      aria-hidden
      className="pointer-events-none fixed z-40 max-w-[13.5rem] rounded-lg border border-white/12 bg-[rgba(5,5,8,0.92)] px-2.5 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
      style={{ left: placement.left, top: placement.top }}
    >
      <p className="whitespace-normal break-words text-[12px] font-semibold leading-snug tracking-tight text-[rgba(243,238,255,0.96)]">
        {label}
      </p>
      <p className="mt-0.5 flex items-center gap-1 text-[11px] leading-snug text-zinc-400">
        {inSelection ? (
          <>
            <Check className="h-3 w-3 text-[rgba(196,181,253,0.9)]" aria-hidden />
            En tu selección
          </>
        ) : (
          "Clic para elegir"
        )}
      </p>
    </div>
  );
}
