/**
 * Panel contextual de zona (producción): elegir el área → cobertura → añadir.
 *
 * La zona tocada llega ya pre-seleccionada; las ampliaciones son alternativas
 * del mismo grupo (radio). Un único CTA añade lo elegido a la selección.
 * También soporta tiers legacy (exact/region/broad) para el lab técnico.
 */

"use client";

import { Check, Plus, X } from "lucide-react";
import type { ContextualSelectionOption } from "@/widgets/body-3d/interaction/bodyInteractionTypes";
import type { ContainedSelectionInfo } from "@/widgets/body-3d/ux/bodyContainedSelection";
import { splitZoneLabel } from "@/widgets/body-3d/ux/bodyUxCopy";
import { getSelectionDisplayLabel } from "@/widgets/body-3d/interaction/bodyInteractionLabels";
import {
  COVERAGE_LABELS,
  getSupportedCoverages,
  regionSupportsCoverage,
  stripCoverageToken,
  type BodyCoverage,
} from "@/widgets/body-3d/domain/bodyPublicSelectionCatalog";

/**
 * full     → panel flotante desktop (lista vertical).
 * peek     → bottom sheet móvil (opciones en carrusel horizontal).
 * expanded → bottom sheet móvil expandido (lista vertical).
 */
export type ContextOptionsMode = "full" | "peek" | "expanded";

type BodyContextOptionsProps = {
  activeAtomicZoneId: string;
  options: readonly ContextualSelectionOption[];
  contained: readonly ContainedSelectionInfo[];
  selectedTargetIds: readonly string[];
  onSelectOption: (targetId: string) => void;
  onPreviewOption: (targetId: string | null) => void;
  onRemoveContained: (targetId: string) => void;
  onChangeSelection: () => void;
  replacingTargetId?: string | null;
  enablePreview?: boolean;
  mode?: ContextOptionsMode;
  className?: string;
  /** Título de panel (región pública primaria). */
  panelTitle?: string | null;
  panelSubtitle?: string | null;
  /** Región en staging (antes de confirmar / con cobertura). */
  stagingRegionId?: string | null;
  stagingCoverage?: BodyCoverage;
  onStagingCoverageChange?: (coverage: BodyCoverage) => void;
  onConfirmStaging?: () => void;
  /** Botón de cierre en la cabecera. */
  onClose?: () => void;
  /**
   * El área elegida no conecta con la selección actual: el CTA la sustituye
   * (con Deshacer) en vez de añadirla.
   */
  disconnected?: boolean;
};

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(168,85,247,0.7)]";

function isPublicTier(tier: ContextualSelectionOption["tier"]) {
  return tier === "primary" || tier === "amplify";
}

function bareId(id: string) {
  return stripCoverageToken(id).regionId;
}

export function BodyContextOptions({
  activeAtomicZoneId,
  options,
  contained,
  selectedTargetIds,
  onSelectOption,
  onPreviewOption,
  onRemoveContained,
  onChangeSelection,
  replacingTargetId = null,
  enablePreview = true,
  mode = "full",
  className = "",
  panelTitle = null,
  panelSubtitle = null,
  stagingRegionId = null,
  stagingCoverage = "complete",
  onStagingCoverageChange,
  onConfirmStaging,
  onClose,
  disconnected = false,
}: BodyContextOptionsProps) {
  const parts = splitZoneLabel(activeAtomicZoneId);
  const selectedBare = new Set(selectedTargetIds.map(bareId));
  const usesPublic = options.some((o) => isPublicTier(o.tier));

  if (contained.length > 0 && mode !== "expanded") {
    return (
      <div className={className}>
        <PanelHeader
          title={panelTitle ?? parts.full}
          subtitle={panelSubtitle}
          onClose={onClose}
        />
        <div className="mt-4 rounded-xl border border-[rgba(167,139,250,0.24)] bg-[rgba(167,139,250,0.07)] p-3">
          {contained.map((c) => (
            <div key={c.targetId} className="[&+&]:mt-3">
              <p className="text-sm leading-snug text-zinc-300">
                Ya forma parte de{" "}
                <span className="font-semibold text-[rgba(243,238,255,0.96)]">
                  {c.label}
                </span>
                .
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onChangeSelection}
                  className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-[rgba(168,85,247,0.4)] bg-[rgba(168,85,247,0.16)] px-3 text-xs font-semibold text-[rgba(240,234,255,0.97)] transition-colors hover:bg-[rgba(168,85,247,0.24)] active:scale-[0.98] ${FOCUS_RING}`}
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveContained(c.targetId)}
                  className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-black/30 px-3 text-xs font-semibold text-zinc-200 transition-colors hover:bg-black/45 active:scale-[0.98] ${FOCUS_RING}`}
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (usesPublic || stagingRegionId != null) {
    const staged =
      stagingRegionId ??
      options.find((o) => o.tier === "primary")?.targetId ??
      options[0]?.targetId ??
      null;
    const stagedAlready = staged != null && selectedBare.has(bareId(staged));
    const coverages =
      staged && regionSupportsCoverage(staged)
        ? getSupportedCoverages(staged)
        : [];
    const title = staged
      ? getSelectionDisplayLabel(staged)
      : (panelTitle ?? getSelectionDisplayLabel(activeAtomicZoneId));
    const compact = mode === "peek";

    return (
      <div className={className}>
        <PanelHeader
          title={title}
          subtitle={compact ? null : panelSubtitle}
          onClose={onClose}
          compact={compact}
        />
        {replacingTargetId ? (
          <p className="mt-2 text-xs leading-snug text-[rgba(196,181,253,0.92)]">
            Elige el área que reemplaza a tu selección actual.
          </p>
        ) : disconnected && !stagedAlready ? (
          <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-xs leading-snug text-amber-100/90">
            Esta zona está separada de tu selección actual. Puedes cambiar a
            esta zona; tu selección anterior se podrá recuperar con Deshacer.
          </p>
        ) : null}

        <div className={compact ? "mt-2 space-y-2.5" : "mt-4 space-y-4"}>
          {options.length > 1 ? (
            <AreaChoices
              options={options}
              stagedId={staged}
              selectedBare={selectedBare}
              enablePreview={enablePreview}
              compact={compact}
              onSelectOption={onSelectOption}
              onPreviewOption={onPreviewOption}
            />
          ) : null}

          {coverages.length > 1 ? (
            <div role="radiogroup" aria-label="Cobertura">
              <p className={compact ? "sr-only" : "text-xs font-medium text-zinc-400"}>
                Cobertura
              </p>
              <div
                className={[
                  "grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/30 p-1",
                  compact ? "" : "mt-1.5",
                ].join(" ")}
              >
                {coverages.map((cov) => {
                  const active = stagingCoverage === cov;
                  return (
                    <button
                      key={cov}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onStagingCoverageChange?.(cov)}
                      className={[
                        compact ? "min-h-9" : "min-h-10",
                        "rounded-lg px-2 text-xs font-semibold transition-colors",
                        FOCUS_RING,
                        active
                          ? "bg-[rgba(168,85,247,0.24)] text-[rgba(243,238,255,0.98)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                          : "text-zinc-400 hover:text-zinc-100",
                      ].join(" ")}
                    >
                      {COVERAGE_LABELS[cov]}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {onConfirmStaging && staged ? (
            <button
              type="button"
              onClick={onConfirmStaging}
              disabled={stagedAlready && !replacingTargetId}
              data-body-confirm
              className={[
                compact ? "min-h-11" : "min-h-12",
                "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors active:scale-[0.98]",
                FOCUS_RING,
                stagedAlready && !replacingTargetId
                  ? "cursor-default border border-white/8 bg-white/[0.03] text-zinc-500"
                  : "border border-[rgba(168,85,247,0.55)] bg-[rgba(147,72,232,0.42)] text-white shadow-[0_8px_24px_rgba(88,28,135,0.35),inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-[rgba(147,72,232,0.56)]",
              ].join(" ")}
            >
              {stagedAlready && !replacingTargetId ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  Ya está en tu selección
                </>
              ) : replacingTargetId ? (
                "Reemplazar selección"
              ) : disconnected ? (
                "Cambiar a esta zona"
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden />
                  Añadir a mi selección
                </>
              )}
            </button>
          ) : null}

          {mode === "full" ? (
            <p className="hidden text-center text-[11px] text-zinc-500 [@media(pointer:fine)]:block">
              <Kbd>Enter</Kbd> añade · <Kbd>Esc</Kbd> cierra
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // Legacy lab tiers
  const byTier = {
    exact: options.filter((o) => o.tier === "exact"),
    region: options.filter((o) => o.tier === "region"),
    broad: options.filter((o) => o.tier === "broad"),
  } as const;

  const tiersToShow: Array<"exact" | "region" | "broad"> =
    mode === "peek"
      ? ["exact", "region"]
      : mode === "expanded"
        ? ["broad"]
        : ["exact", "region", "broad"];

  return (
    <div className={className}>
      <PanelHeader title={parts.full} subtitle={parts.detail} onClose={onClose} />
      <div className="mt-4 space-y-4">
        {tiersToShow.map((tier) => {
          const list = byTier[tier];
          if (list.length === 0) return null;
          return (
            <LegacyOptionGroup
              key={tier}
              title={
                tier === "exact"
                  ? "Zona exacta"
                  : tier === "region"
                    ? "Zona anatómica"
                    : "Selección comercial"
              }
              options={list}
              selectedBare={selectedBare}
              enablePreview={enablePreview}
              onSelectOption={onSelectOption}
              onPreviewOption={onPreviewOption}
            />
          );
        })}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-white/12 bg-white/[0.04] px-1 py-px font-sans text-[10px] font-medium text-zinc-400">
      {children}
    </kbd>
  );
}

function PanelHeader({
  title,
  subtitle,
  onClose,
  compact = false,
}: {
  title: string;
  subtitle?: string | null;
  onClose?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex items-center gap-3" : "flex items-start gap-3"}>
      <div className="min-w-0 flex-1">
        <h2
          className={[
            "font-semibold leading-snug tracking-tight text-[rgba(245,240,255,0.97)]",
            compact
              ? "truncate text-[0.9375rem]"
              : "text-base sm:text-[1.0625rem] [text-wrap:balance]",
          ].join(" ")}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm leading-snug text-zinc-400">{subtitle}</p>
        ) : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel de zona"
          className={`-mr-1.5 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 ${FOCUS_RING}`}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/** Alternativas de área (radio): zona tocada primero, luego ampliaciones. */
function AreaChoices({
  options,
  stagedId,
  selectedBare,
  enablePreview,
  compact,
  onSelectOption,
  onPreviewOption,
}: {
  options: readonly ContextualSelectionOption[];
  stagedId: string | null;
  selectedBare: ReadonlySet<string>;
  enablePreview: boolean;
  compact: boolean;
  onSelectOption: (id: string) => void;
  onPreviewOption: (id: string | null) => void;
}) {
  const stagedBare = stagedId ? bareId(stagedId) : null;
  return (
    <div role="radiogroup" aria-label="Área a tatuar">
      <p className={compact ? "sr-only" : "text-xs font-medium text-zinc-400"}>Área a tatuar</p>
      <div
        className={
          compact
            ? "-mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "mt-1.5 flex flex-col gap-1"
        }
      >
        {options.map((option) => {
          const active = stagedBare === option.targetId;
          const already = selectedBare.has(option.targetId);
          const label = option.shortLabel || option.label;
          return (
            <button
              key={option.targetId}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={already ? `${option.label} (ya en tu selección)` : option.label}
              onClick={() => onSelectOption(option.targetId)}
              onPointerEnter={() => {
                if (enablePreview) onPreviewOption(option.targetId);
              }}
              onPointerLeave={() => {
                if (enablePreview) onPreviewOption(null);
              }}
              className={[
                "group inline-flex items-center gap-2.5 border text-left text-sm font-medium leading-snug transition-colors active:scale-[0.99]",
                FOCUS_RING,
                compact
                  ? "min-h-10 shrink-0 snap-start rounded-full px-3.5"
                  : "min-h-11 w-full rounded-xl px-3 py-2",
                active
                  ? "border-[rgba(168,85,247,0.5)] bg-[rgba(168,85,247,0.16)] text-[rgba(243,238,255,0.98)]"
                  : "border-white/8 bg-black/25 text-zinc-300 hover:border-white/16 hover:bg-black/40 hover:text-zinc-100",
              ].join(" ")}
            >
              {compact ? null : (
                <span
                  aria-hidden
                  className={[
                    "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                    active
                      ? "border-[rgba(192,132,252,0.95)] bg-[rgba(168,85,247,0.9)]"
                      : "border-white/25 group-hover:border-white/45",
                  ].join(" ")}
                >
                  {active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : null}
                </span>
              )}
              <span className={compact ? "whitespace-nowrap" : "min-w-0 flex-1 break-words"}>
                {label}
              </span>
              {already ? (
                <Check
                  className="h-3.5 w-3.5 shrink-0 text-[rgba(196,181,253,0.85)]"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LegacyOptionGroup({
  title,
  options,
  selectedBare,
  enablePreview,
  onSelectOption,
  onPreviewOption,
}: {
  title: string;
  options: readonly ContextualSelectionOption[];
  selectedBare: ReadonlySet<string>;
  enablePreview: boolean;
  onSelectOption: (id: string) => void;
  onPreviewOption: (id: string | null) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-400">{title}</p>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {options.map((option) => {
          const already = selectedBare.has(option.targetId);
          return (
            <button
              key={option.targetId}
              type="button"
              disabled={already}
              aria-label={option.label}
              onClick={() => onSelectOption(option.targetId)}
              onPointerEnter={() => {
                if (enablePreview) onPreviewOption(option.targetId);
              }}
              onPointerLeave={() => {
                if (enablePreview) onPreviewOption(null);
              }}
              className={[
                "min-h-11 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold leading-snug transition-colors active:scale-[0.98]",
                FOCUS_RING,
                already
                  ? "cursor-default border-white/8 bg-white/[0.03] text-zinc-500"
                  : "border-white/10 bg-black/30 text-zinc-100 hover:border-white/18 hover:bg-black/45",
              ].join(" ")}
            >
              {option.shortLabel || option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
